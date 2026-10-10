import sys

import data_access
import model
from utils import setup_console, pad_right, normalize_name


def analyze_material_balance(target_region="武陵"):
    master = data_access.load_master()
    cfg = data_access.load_config()
    inputs = data_access.load_region_inputs(target_region, master)
    if inputs is None:
        print(f"[ERROR] 地域 '{target_region}' が config/resources.csv に定義されていません。")
        return

    # solverと同じフルモデル(電力・整数施設・施設上限・転送を含む)で求解する
    prob, variables = model.build_model(master, cfg, inputs, mode="profit")
    sol = model.solve(prob, variables, cfg)
    if not sol.is_usable:
        print(f"[ERROR] 最適化が完了しませんでした (ステータス: {sol.status})")
        return

    print(f"============================================================")
    print(f"  リサイクルループ収支分析: {target_region}")
    print(f"============================================================\n")

    target_items = cfg.get("loop_analysis_items", [])

    for t_name in target_items:
        iid = next((i for i, it in master['items'].items() if normalize_name(it['name']) == normalize_name(t_name)), None)
        if not iid: continue

        sources, destinations = model.item_flow(sol, master, iid)
        val_in = sum(x[3] for x in sources)
        val_out = sum(x[3] for x in destinations)
        sales = sol.sales.get(iid, 0)
        raw_supply = inputs.resource_limits.get(normalize_name(t_name), 0)

        if val_in + val_out + sales + raw_supply < 0.001: continue

        print(f"【{t_name}】")
        print(f"  [供給] 合計: {val_in + raw_supply:5.1f} /min")
        if raw_supply > 0.001:
            print(f"    - {'天然資源':24} : +{raw_supply:5.1f} /min")
        for name, fac, num, amt in sources:
            print(f"    - {pad_right(name, 24)} : +{amt:5.1f} /min ({fac})")

        print(f"  [消費] 合計: {val_out + sales:5.1f} /min")
        for name, fac, num, amt in destinations:
            print(f"    - {pad_right(name, 24)} : -{amt:5.1f} /min ({fac})")
        if sales > 0.001:
            print(f"    - {'納品/売却':24} : -{sales:5.1f} /min")
        print("-" * 40)


if __name__ == "__main__":
    setup_console()
    region = sys.argv[1] if len(sys.argv) > 1 else "武陵"
    analyze_material_balance(region)
