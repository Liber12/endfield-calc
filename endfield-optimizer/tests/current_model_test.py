"""Current-game constraint tests (independent of the v0.6.2 snapshot)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from data_access import RegionInputs
from model import build_model, solve


def example_master(recipes):
    return {
        "sourceVersion": "0.10.0",
        "items": {
            "item_ore": {"name": "ore", "isRaw": 1, "isLiquid": 0},
            "item_product": {"name": "product", "isRaw": 0, "isLiquid": 0},
            "item_liquid_xiranite": {"name": "catalyst", "isRaw": 1, "isLiquid": 1},
            "item_gas_inert": {"name": "gas", "isRaw": 1, "isLiquid": 0},
            "item_liquid_water": {"name": "water", "isRaw": 1, "isLiquid": 1},
        },
        "facilities": {
            "transmuter_1": {"power": 5, "domains": ["domain_2"]},
            "gas_reactor_1": {"power": 5, "domains": ["domain_2"]},
            "vaporizer_1": {"power": 0, "domains": ["domain_2"]},
            "component_mc_1": {"power": 0, "domains": []},
            "pump_1": {"power": 10, "domains": ["domain_2"]},
        },
        "recipes": recipes,
        "facilitySustainDrains": {
            "transmuter_1": {"itemId": "item_liquid_xiranite", "ratePerMinute": 6},
        },
        "vaporizerEnvs": {
            "1": {"gasItemId": "item_gas_inert", "ratePerMinute": 6},
        },
        "rawSourceFacilities": {
            "item_liquid_water": {"facilityId": "pump_1", "ratePerMinute": 60},
        },
    }


def make_recipe(name, facility, consumed, gas_env=0):
    return {
        "id": name,
        "name": name,
        "facilityId": facility,
        "facilityName": facility,
        "time": 60,
        "gasEnv": gas_env,
        "inputs": [{"id": consumed, "amount": 1}],
        "outputs": [{"id": "item_product", "amount": 1}],
    }


def run(master, limits, region="武陵", base_power=20):
    cfg = {
        "solver": {"base_power": base_power, "time_limit_sec": 5},
        "transfer_rules": {"enabled": False},
        "target_parts": [], "min_production": {},
    }
    inputs = RegionInputs(
        region=region,
        item_prices={"product": 1},
        resource_limits=limits,
        gen_supply_per_unit={},
        gen_seconds={},
    )
    problem, variables = build_model(master, cfg, inputs, mode="profit")
    answer = solve(problem, variables, cfg)
    assert answer.is_usable, answer.status
    return answer


def main():
    transmuter = make_recipe("r_catalyst", "transmuter_1", "item_ore")
    master = example_master([transmuter])
    assert run(master, {"ore": 1, "catalyst": 0}).profit < 1e-5
    assert abs(run(master, {"ore": 1, "catalyst": 6}).profit - 1) < 1e-5

    reactor = make_recipe("r_gas", "gas_reactor_1", "item_ore", gas_env=1)
    master = example_master([reactor])
    assert run(master, {"ore": 1, "gas": 0}).profit < 1e-5
    fueled = run(master, {"ore": 1, "gas": 6})
    assert abs(fueled.profit - 1) < 1e-5
    assert fueled.vaporizer_counts["1"] == 1
    assert run(master, {"ore": 1, "gas": 6}, region="四号谷地").profit < 1e-5

    water_recipe = make_recipe("r_water", "component_mc_1", "item_liquid_water")
    master = example_master([water_recipe])
    assert run(master, {"water": 0}, base_power=0).profit < 1e-5
    pumped = run(master, {"water": 0}, base_power=10)
    assert 0 < pumped.profit <= 60.00001
    assert pumped.source_counts["item_liquid_water"] == 1
    assert pumped.power_consumed <= pumped.power_generated + 1e-6
    print("Current model constraints passed (catalyst, gas, domains, pump power).")


if __name__ == "__main__":
    main()
