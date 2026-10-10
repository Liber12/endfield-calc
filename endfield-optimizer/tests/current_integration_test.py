"""Check the current-source MILP, not just its isolated constraints."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import data_access
import model


def main():
    master = data_access.load_master()
    assert master["sourceVersion"] == "0.10.0"
    for region in ("武陵", "四号谷地"):
        answer = model.optimize(region, mode="profit")
        print(f"{region}: {answer.status}, profit={answer.profit}")
        assert answer.is_usable, f"{region}: {answer.status}"
        assert answer.power_consumed <= answer.power_generated + 0.02
        for iid, rate in answer.source_counts.items():
            assert rate >= -0.000001, (iid, rate)
        assert answer.profit >= -0.000001
        inputs = data_access.load_region_inputs(region, master)
        assert len(inputs.outpost_offers) == 3, (region, inputs.outpost_offers.keys())
        assert len(answer.outpost_income) == 3
        assert abs(sum(answer.outpost_income.values()) - answer.profit) < 0.01
        for post, income in answer.outpost_income.items():
            assert income >= -0.0001
            assert income <= inputs.outpost_budget_per_min[post] + 0.001, (post, income)
        region_budget = sum(inputs.outpost_budget_per_min.values())
        assert answer.profit <= region_budget + 0.01
        print(f"  Sustainable base stock-bill ceiling: {region_budget:,.2f} /min")
    cfg = data_access.load_config()
    cfg["outpost_levels"] = {"壌晶雨発生施設": 0}
    closed = model.optimize("武陵", mode="profit", cfg_override=cfg)
    assert closed.is_usable, closed.status
    assert "壌晶雨発生施設" not in closed.outpost_income
    assert closed.profit <= (30000 + 22800) / 60 + 0.01, closed.profit


if __name__ == "__main__":
    main()
