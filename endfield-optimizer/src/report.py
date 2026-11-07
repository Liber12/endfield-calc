from model import item_flow
from utils import pad_right, pad_left, normalize_name

COL_NAME = 28
COL_PRICE = 8
COL_VAL = 10
COL_PROFIT = 12
COL_RATIO = 10
COL_RECIPE = 26
COL_FAC = 16
COL_NUM = 8
COL_PROD = 12


def render_error(sol):
    print("=" * 70)
    if sol.status in ("Infeasible", "Unbounded"):
        print(f"  [ERROR] 最適化計算が正常に完了しませんでした（制約を満たす解が存在しません）。")
    else:
        print(f"  [ERROR] 有効な計算結果（暫定解）が得られませんでした。")
    print(f"  ステータス: {sol.status}")
    print("=" * 70)


def render_dashboard(sol, master, cfg, inputs, mode):
    print("=" * 70)
    if sol.status != "Optimal":
        print(f"  [WARNING] 制限時間内に最適値の証明が完了しなかったため、暫定解を表示します。 (ステータス: {sol.status})")
    print(f"  {inputs.region} 基地運用ダッシュボード ({mode.upper()}モード)")
    print("=" * 70)

    _render_summary(sol, master, inputs)
    _render_bottlenecks(sol, master, inputs)
    _render_infrastructure(sol, master, cfg, inputs)
    _render_production_lines(sol, master, cfg)
    _render_supply_chain(sol, master)

    print("=" * 70)


def _render_summary(sol, master, inputs):
    print("\n[1] 収益・納品サマリー")
    if sol.outpost_income:
        currency = "武陵取引券" if inputs.region == "武陵" else "谷地取引券"
        print(f"  持続可能な基礎収入: {sol.profit:,.2f} {currency}/分 (補充量による上限、ボーナスなし)")
        for post, budget in inputs.outpost_budget_per_min.items():
            received = sol.outpost_income.get(post, 0)
            print(f"    {post}: {received:,.2f} / {budget:,.2f} 券/分 (拠点Lv {inputs.outpost_levels[post]})")
        rows = []
        for post, offers in sol.outpost_sales.items():
            for iid, amount in offers.items():
                if amount <= 0.001:
                    continue
                item = master["items"][iid]
                price = inputs.outpost_offers[post][normalize_name(item["name"])]
                rows.append((post, item["name"], price, amount, amount * price))
        print(f"  {pad_right('拠点・アイテム名', 36)} {pad_left('単価', COL_PRICE)} {pad_left('納品/分', COL_VAL)} {pad_left('券/分', COL_PROFIT)}")
        for post, name, price, amount, income in sorted(rows, key=lambda x: x[-1], reverse=True):
            label = f"{post} / {name}"
            print(f"  {pad_right(label, 36)} {pad_left(price, COL_PRICE)} {pad_left(f'{amount:.2f}', COL_VAL)} {pad_left(f'{income:.2f}', COL_PROFIT)}")
    else:
        print(f"  合計収益  : {sol.profit:,.2f} 券/分 (旧モデル/単体テスト)")
        rows = []
        for iid, amount in sol.sales.items():
            if amount <= 0.001:
                continue
            name = master["items"][iid]["name"]
            price = inputs.item_prices.get(normalize_name(name), 0)
            rows.append((name, price, amount, amount * price))
        for name, price, amount, income in sorted(rows, key=lambda x: x[-1], reverse=True):
            print(f"  {pad_right(name, COL_NAME)} {pad_left(price, COL_PRICE)} {pad_left(f'{amount:.1f}', COL_VAL)} {pad_left(f'{income:.1f}', COL_PROFIT)}")


def _render_bottlenecks(sol, master, inputs):
    print(f"\n[2] 制約・ボトルネック分析")
    print(f"  {pad_right('名称', COL_NAME)} {pad_left('利用率', COL_VAL)}  {pad_right('状態', 12)}")
    for name, limit in inputs.resource_limits.items():
        if 0 < limit < 99999:
            cons = 0
            for iid, it in master['items'].items():
                if normalize_name(it['name']) == name:
                    v = sol.item_net[iid]; cons = abs(v) if v < 0 else 0; break
            cons += sol.burn.get(name, 0)
            rate = cons / limit * 100
            print(f"  {pad_right(name, COL_NAME)} {pad_left(f'{rate:.1f}%', COL_VAL)}  {pad_right('[MAX] 限界' if rate >= 99.9 else '[OK] 余裕', 12)}")
    for fid, limit in inputs.facility_limits.items():
        actual = sum([sol.facility_n[r['id']] for r in master['recipes'] if r['facilityId'] == fid])
        if actual > 0.01:
            name = master['facilities'].get(fid, {}).get('name', fid)
            rate = actual / limit * 100
            print(f"  {pad_right(name + '枠', COL_NAME)} {pad_left(f'{rate:.1f}%', COL_VAL)}  {pad_right('[MAX] 限界' if rate >= 99.9 else '[OK] 余裕', 12)}")


def _render_infrastructure(sol, master, cfg, inputs):
    print(f"\n[3] インフラ状況")
    print(f"  電力収支: {sol.power_consumed:,.1f}W / {sol.power_generated:,.1f}W")
    fuel_list = [f"{n} (消費: {sol.burn[n]:.1f}/min, 発電機: {sol.generator_counts[n]:.1f}台)" for n in sol.burn if sol.burn[n] > 0.001]
    if fuel_list: print(f"  燃料消費: {', '.join(fuel_list)}")
    sources = [f"{master['items'][iid]['name']}: {count:.0f}台" for iid, count in sol.source_counts.items() if count > 0.001]
    vaporizers = [f"環境{env}: {count:.0f}台" for env, count in sol.vaporizer_counts.items() if count > 0.001]
    if sources:
        print(f"  原料ポンプ: {', '.join(sources)}")
    if vaporizers:
        print(f"  ガス散布機: {', '.join(vaporizers)}")

    transfer_rules = cfg.get("transfer_rules", {})
    if transfer_rules.get("enabled", False):
        transfer_points = inputs.transfer_points if master.get("sourceVersion") else transfer_rules.get("points", {})
        transfer_list = []
        total_pts_used = 0.0
        for iid, val in sol.transfers.items():
            if val and val > 0.001:
                item_name = master['items'][iid]['name']
                transfer_list.append(f"{item_name} ({val:.1f}/min)")
                total_pts_used += val * transfer_points[iid]
        if transfer_list:
            budget = (inputs.transfer_budget_per_min * 60) if master.get("sourceVersion") else transfer_rules.get("limit_per_hour", 1500)
            print(f"  無在庫転送（総転送価値）: {', '.join(transfer_list)} (計 {total_pts_used * 60:,.1f} / {budget:,.0f} pt/h)")

    disposal_report = []
    for iid, it in master['items'].items():
        if it.get('isDisposal', 0) == 1:
            produced_list, consumed_list = item_flow(sol, master, iid)
            produced = sum(x[3] for x in produced_list)
            consumed = sum(x[3] for x in consumed_list)
            if produced > 0.01 or consumed > 0.01:
                disposal_report.append(f"{normalize_name(it['name'])} (発生: {produced:.1f}/min, 処理: {consumed:.1f}/min)")
    if disposal_report:
        print(f"  廃棄物処理: {', '.join(disposal_report)}")


def _render_production_lines(sol, master, cfg):
    print(f"\n[4] 生産ライン詳細")
    print(f"  {pad_right('アイテム/レシピ名', COL_RECIPE)} {pad_right('施設', COL_FAC)} {pad_left('台数', COL_NUM)} {pad_left('生産量', COL_PROD)}")
    active_recipes = []
    for r in master['recipes']:
        rate = sol.recipe_rates[r['id']]
        if rate > 0.001:
            num = sol.facility_n[r['id']]
            active_recipes.append({"r": r, "num": num, "rate": rate})
    for cat_name, fac_types in cfg.get("categories", {}).items():
        cat_items = [x for x in active_recipes if x['r']['facilityName'] in fac_types]
        if cat_items:
            print(f" --- 【{cat_name}】 ---")
            for row in sorted(cat_items, key=lambda x: x['num'], reverse=True):
                print(f"  {pad_right(row['r']['name'], COL_RECIPE)} {pad_right(row['r']['facilityName'], COL_FAC)} {pad_left(f'{row['num']:.1f}', COL_NUM)} {pad_left(f'{row['rate']:.1f}', COL_PROD)}/min")


def _render_supply_chain(sol, master):
    print(f"\n[5] サプライチェーン・トレース")
    for iid, val in sol.sales.items():
        if val > 0.1:
            item_name = master['items'][iid]['name']
            print(f"  {pad_right(item_name, COL_NAME)} : {val:,.1f}/min 納品中")
            for r in master['recipes']:
                if any(o['id'] == iid for o in r['outputs']):
                    r_rate = sol.recipe_rates[r['id']]
                    if r_rate > 0.001:
                        print(f"    <- {pad_right('[' + r['facilityName'] + ']', COL_FAC)} {r['id']} ({sol.facility_n[r['id']]:.0f}台)")

    # 廃棄物（汚水など）のトレース
    for iid, it in master['items'].items():
        if it.get('isDisposal', 0) == 1:
            produced_list, consumed_list = item_flow(sol, master, iid)
            if produced_list or consumed_list:
                print(f"  {pad_right(it['name'], COL_NAME)} : (発生・処理の追跡)")
                if produced_list:
                    print(f"    [発生元] (総量: {sum(x[3] for x in produced_list):,.1f}/min)")
                    for name, fac, num, amt in sorted(produced_list, key=lambda x: x[3], reverse=True):
                        print(f"      <- {pad_right('[' + fac + ']', COL_FAC)} {name} ({num:.1f}台) : {amt:,.1f}/min")
                if consumed_list:
                    print(f"    [処理先] (総量: {sum(x[3] for x in consumed_list):,.1f}/min)")
                    for name, fac, num, amt in sorted(consumed_list, key=lambda x: x[3], reverse=True):
                        print(f"      -> {pad_right('[' + fac + ']', COL_FAC)} {name} ({num:.1f}台) : {amt:,.1f}/min")
