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


if __name__ == "__main__":
    main()
