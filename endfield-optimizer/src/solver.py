import sys

import data_access
import model
import report
from utils import setup_console


def run(region="武陵", mode="balance", sanity=False, snapshot=False):
    master = data_access.load_master(snapshot=snapshot)
    if mode not in ("balance", "profit"):
        raise ValueError("mode must be balance or profit")
    if not snapshot:
        print(f"[PREVIEW] Calculator source {master['sourceVersion']}; economic delivery caps, unlock state and spatial layout are not fully modeled.")
    cfg = data_access.load_config()
    inputs = data_access.load_region_inputs(region, master, sanity=sanity)
    if inputs is None:
        print(f"[ERROR] 地域 '{region}' が config/resources.csv に定義されていません。")
        return None

    prob, variables = model.build_model(master, cfg, inputs, mode=mode, sanity=sanity)
    sol = model.solve(prob, variables, cfg)

    if not sol.is_usable:
        report.render_error(sol)
        return sol

    report.render_dashboard(sol, master, cfg, inputs, mode)
    return sol


if __name__ == "__main__":
    setup_console()
    region = sys.argv[1] if len(sys.argv) > 1 else "武陵"
    mode = sys.argv[2] if len(sys.argv) > 2 else "balance"
    snapshot = "--snapshot" in sys.argv[3:]
    answer = run(region, mode=mode, snapshot=snapshot)
    if answer is None or not answer.is_usable:
        sys.exit(1)
