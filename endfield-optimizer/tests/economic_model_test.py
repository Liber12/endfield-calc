"""Current outpost economics: allocation, stage and transfer direction regression."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.dirname(__file__))

import data_access
import model
from utils import normalize_name
from current_model_test import example_master, make_recipe


def test_outpost_income():
    master = example_master([make_recipe("r", "component_mc_1", "item_ore")])
    inputs = data_access.RegionInputs(
        region="武陵",
        item_prices={"product": 10},
        resource_limits={"ore": 2},
        outpost_offers={"high": {"product": 10}, "low": {"product": 2}},
        outpost_budget_per_min={"high": 10, "low": 2},
    )
    cfg = {"solver": {"base_power": 0}, "target_parts": [],
           "transfer_rules": {"enabled": False}, "min_production_by_region": {}}
    prob, variables = model.build_model(master, cfg, inputs, mode="profit")
    sol = model.solve(prob, variables, cfg)
    assert sol.is_usable, sol.status
    assert abs(sol.profit - 12) < 0.005, sol.profit
    assert abs(sol.outpost_income["high"] - 10) < 0.005
    assert abs(sol.outpost_income["low"] - 2) < 0.005
    assert abs(sol.sales["item_product"] - 2) < 0.005
    # Minimum local output must remain after goods are sent to the outposts.
    cfg["min_production_by_region"] = {"武陵": {"product": 1}}
    reserved_problem, reserved_vars = model.build_model(master, cfg, inputs, mode="profit")
    reserved = model.solve(reserved_problem, reserved_vars, cfg)
    assert reserved.is_usable, reserved.status
    assert abs(reserved.profit - 10) < 0.005, reserved.profit
    assert reserved.sales["item_product"] <= 1.001


def test_real_outpost_catalog():
    master = data_access.load_master()
    cfg = data_access.load_config()
    wuling = data_access.load_region_inputs("武陵", master, cfg=cfg)
    valley = data_access.load_region_inputs("四号谷地", master, cfg=cfg)
    assert len(wuling.outpost_offers) == len(valley.outpost_offers) == 3
    assert abs(sum(wuling.outpost_budget_per_min.values()) - 1280) < 0.01
    assert abs(sum(valley.outpost_budget_per_min.values()) - 1525) < 0.01
    assert "焔銅部品" in wuling.outpost_offers["満天台建設基地"]
    assert wuling.outpost_offers["満天台建設基地"]["焔銅部品"] == 70
    assert not valley.transfer_points, "Valley cannot import its own exports"
    assert wuling.transfer_points == master["metastorageExports"]["domain_1"]
    assert "item_copper_ore" not in wuling.transfer_points
    assert "item_liquid_water" not in wuling.transfer_points
    copper_name = master["items"]["item_copper_ore"]["name"]
    xiranite_name = master["items"]["item_gas_xiranite"]["name"]
    assert wuling.resource_limits[copper_name] == 510
    assert wuling.resource_limits[xiranite_name] == 150
    assert master["regionalRawCaps"]["domain_2"]["item_copper_ore"] == 420
    assert master["regionalRawCaps"]["domain_2"]["item_gas_xiranite"] == 100
    assert wuling.outpost_offers["心臓修復施設"]["焔銅部品"] == 70
    assert wuling.outpost_offers["天王原建設支援拠点"]["重息壌"] == 27
    assert wuling.outpost_offers["天王原建設支援拠点"][normalize_name("錦草ソーダⅡ")] == 22


if __name__ == "__main__":
    test_outpost_income()
    test_real_outpost_catalog()
    print("Current 1.5 outpost and Metastorage economic constraints passed.")
