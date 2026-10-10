from dataclasses import dataclass, field

import pulp

import data_access
from utils import normalize_name

DEFAULT_SOLVER_PARAMS = {
    "base_power": 200,
    "facility_penalty": 0.0001,
    "time_limit_sec": 15,
    "gap_rel": 0.001,
}


@dataclass
class Solution:
    """求解済みMILPの結果。数値のみを持ち、pulpオブジェクトはここで断ち切る。"""
    status: str
    profit: float = None                        # 純粋な販売収益(目的関数の補正項を含まない)
    sales: dict = field(default_factory=dict)          # item_id -> 納品量/min
    recipe_rates: dict = field(default_factory=dict)   # recipe_id -> 生産レート/min
    facility_n: dict = field(default_factory=dict)     # recipe_id -> 整数変数としての施設台数
    burn: dict = field(default_factory=dict)           # 燃料名(normalize済) -> 消費量/min
    generator_counts: dict = field(default_factory=dict)  # 燃料名 -> 発電機台数
    source_counts: dict = field(default_factory=dict)
    vaporizer_counts: dict = field(default_factory=dict)
    transfers: dict = field(default_factory=dict)      # item_id -> 無在庫転送量/min
    item_net: dict = field(default_factory=dict)       # item_id -> レシピ収支の純増減/min
    power_consumed: float = 0.0
    power_generated: float = 0.0

    @property
    def is_usable(self):
        return self.status == "Optimal" and self.profit is not None


def _solver_params(cfg):
    params = dict(DEFAULT_SOLVER_PARAMS)
    params.update(cfg.get("solver", {}))
    return params


def build_model(master, cfg, inputs, mode="balance", sanity=False):
    """MILPを構築して (prob, 変数・式の束) を返す。"""
    params = _solver_params(cfg)
    gen_item_names = list(inputs.gen_supply_per_unit.keys())
    current = bool(master.get("sourceVersion"))
    region_domain = {"四号谷地": "domain_1", "武陵": "domain_2"}.get(inputs.region)
    if current and not region_domain:
        raise ValueError(f"Unknown current game domain: {inputs.region}")
    sustains = master.get("facilitySustainDrains", {})
    envs = master.get("vaporizerEnvs", {})

    prob = pulp.LpProblem(f"Endfield_{inputs.region}_{mode}", pulp.LpMaximize)
    recipe_rate = {r['id']: pulp.LpVariable(f"Rate_{r['id']}", lowBound=0) for r in master['recipes']}
    facility_n = {r['id']: pulp.LpVariable(f"FacN_{r['id']}", lowBound=0, cat='Integer') for r in master['recipes']}

    gen_cat = 'Integer' if cfg.get("integer_generators", True) else 'Continuous'
    gen_n = {name: pulp.LpVariable(f"GenN_{name}", lowBound=0, cat=gen_cat) for name in gen_item_names}

    burn_vars = pulp.LpVariable.dicts("Burn", gen_item_names, lowBound=0)
    # Current data: pumped liquids require real throughput and electric power.
    raw_sources = {
        iid: info for iid, info in master.get("rawSourceFacilities", {}).items()
        if not sanity and iid in master["items"] and master["items"][iid].get("isLiquid")
        and normalize_name(master["items"][iid]["name"]) in inputs.resource_limits
        and info.get("ratePerMinute")
    }
    source_n = {iid: pulp.LpVariable(f"RawSource_{iid}", lowBound=0, cat="Integer") for iid in raw_sources}
    source_rate = {iid: pulp.LpVariable(f"RawRate_{iid}", lowBound=0) for iid in raw_sources}
    for iid, info in raw_sources.items():
        prob += source_rate[iid] <= source_n[iid] * info["ratePerMinute"]

    # Vaporizer runs continuously; aggregate coverage is conservative.
    vaporizer_n = {str(e): pulp.LpVariable(f"Vaporizer_{e}", lowBound=0, cat="Integer") for e in envs}
    per_vaporizer = max(1, int(cfg.get("machines_per_vaporizer", 4)))
    for env, count in vaporizer_n.items():
        participating = [facility_n[r["id"]] for r in master["recipes"] if str(r.get("gasEnv", 0)) == env]
        prob += pulp.lpSum(participating) <= per_vaporizer * count
    sales_vars = pulp.LpVariable.dicts("Sales", master['items'].keys(), lowBound=0)

    # 無在庫転送: ポイント予算内で素材を外部から持ち込める
    transfer_rules = cfg.get("transfer_rules", {})
    use_transfer = transfer_rules.get("enabled", False)
    transfer_points = transfer_rules.get("points", {}) if use_transfer else {}
    transfer_item_ids = list(transfer_points.keys())
    transfer_vars = pulp.LpVariable.dicts("Transfer", transfer_item_ids, lowBound=0) if use_transfer else {}

    if use_transfer:
        limit_per_min = transfer_rules.get("limit_per_hour", 1500) / 60.0
        prob += pulp.lpSum([transfer_vars[iid] * transfer_points[iid] for iid in transfer_item_ids]) <= limit_per_min

    # 施設設置上限
    all_fac_ids = set([r['facilityId'] for r in master['recipes'] if r['facilityId']])
    for fid in all_fac_ids:
        if fid in inputs.facility_limits:
            relevant_rids = [r['id'] for r in master['recipes'] if r['facilityId'] == fid]
            prob += pulp.lpSum([facility_n[rid] for rid in relevant_rids]) <= inputs.facility_limits[fid]

    # 地域ルール(禁止施設・禁止アイテム・液体禁止)
    banned_facilities = []
    banned_item_ids = []
    regional_rules = cfg.get("regional_rules", {}).get(inputs.region, {})
    if regional_rules:
        banned_facilities = regional_rules.get("banned_facilities", [])
        banned_item_ids = regional_rules.get("banned_items", []).copy()
        if regional_rules.get("ban_liquids", False):
            banned_item_ids += [iid for iid, it in master['items'].items() if it['isLiquid'] == 1]

    for r in master['recipes']:
        rid = r['id']; is_banned = False
        if r['facilityId'] in banned_facilities: is_banned = True
        facility_domains = master["facilities"].get(r["facilityId"], {}).get("domains", [])
        if current and facility_domains and region_domain not in facility_domains:
            is_banned = True
        for inp in r['inputs']:
            if inp['id'] in banned_item_ids: is_banned = True; break
        for out in r['outputs']:
            if out['id'] in banned_item_ids: is_banned = True; break

        if is_banned:
            prob += recipe_rate[rid] == 0; prob += facility_n[rid] == 0
        elif r['time'] > 0: prob += recipe_rate[rid] <= facility_n[rid] * (60 / r['time'])
        else: prob += recipe_rate[rid] == 0

    # 発電機台数と燃料消費の対応
    for name in gen_item_names:
        prob += burn_vars[name] == gen_n[name] * (60 / inputs.gen_seconds[name])

    # アイテム収支
    item_net = {str(iid).strip(): 0 for iid in master['items'].keys()}
    for r in master['recipes']:
        rid = r['id']
        for inp in r['inputs']:
            iid = str(inp['id']).strip()
            if iid in item_net: item_net[iid] -= inp['amount'] * recipe_rate[rid]
        for out in r['outputs']:
            iid = str(out['id']).strip()
            if iid in item_net: item_net[iid] += out['amount'] * recipe_rate[rid]

    # Catalyst upkeep is proportional to recipe duty (T seconds per run).
    for r in master["recipes"]:
        drain = sustains.get(r["facilityId"])
        if not drain:
            continue
        iid = drain["itemId"]
        if iid not in item_net:
            raise ValueError(f"Unknown catalyst item: {iid}")
        item_net[iid] -= drain["ratePerMinute"] * (r["time"] / 60) * recipe_rate[r["id"]]

    # Gas dispersing units must remain on, even for part-duty machines.
    for env, info in envs.items():
        iid = info["gasItemId"]
        if iid not in item_net:
            raise ValueError(f"Unknown vaporizer fuel: {iid}")
        item_net[iid] -= info["ratePerMinute"] * vaporizer_n[str(env)]
    for iid, rate in source_rate.items():
        item_net[iid] += rate

    for iid, it in master['items'].items():
        iid_clean = str(iid).strip(); name = normalize_name(it['name'])
        supply = inputs.resource_limits.get(name, 0)
        burn = burn_vars[name] if name in gen_item_names else 0
        trans_val = transfer_vars[iid_clean] if use_transfer and iid_clean in transfer_item_ids else 0

        # 廃棄物(isDisposal == 1)は蓄積禁止のため等号制約
        if it.get('isDisposal', 0) == 1:
            prob += item_net[iid_clean] + supply + trans_val - sales_vars[iid_clean] - burn == 0
        else:
            prob += item_net[iid_clean] + supply + trans_val - sales_vars[iid_clean] - burn >= 0

        if name not in inputs.item_prices: prob += sales_vars[iid_clean] == 0

        # Historical snapshots preserve their original global floor.
        # Current-game floors must be region-scoped: Wuling parts are
        # impossible to require in Valley IV.
        floors = (
            cfg.get("min_production_by_region", {}).get(inputs.region, {})
            if current else cfg.get("min_production", {})
        )
        min_prod = floors.get(name, 0.0)
        if min_prod > 0.001:
            prob += item_net[iid_clean] + supply + trans_val - burn >= min_prod

    # 電力収支
    total_cons = pulp.lpSum([facility_n[r['id']] * master['facilities'].get(r['facilityId'], {}).get('power', 0) for r in master['recipes']])
    total_cons += pulp.lpSum(
        source_n[iid] * master["facilities"].get(info["facilityId"], {}).get("power", 0)
        for iid, info in raw_sources.items()
    )
    total_cons += pulp.lpSum(vaporizer_n.values()) * master["facilities"].get("vaporizer_1", {}).get("power", 0)
    total_gen = params["base_power"] + pulp.lpSum([burn_vars[name] * inputs.gen_supply_per_unit[name] for name in gen_item_names])
    prob += total_gen >= total_cons

    # 目的関数
    total_profit = pulp.lpSum([sales_vars[iid] * inputs.item_prices.get(normalize_name(master['items'][iid]['name']), 0) for iid in master['items']])
    target_parts = cfg.get("target_parts", [])
    parts_total = pulp.lpSum([item_net[iid] for iid, it in master['items'].items() if normalize_name(it['name']) in target_parts])
    total_facilities = pulp.lpSum(facility_n.values()) + pulp.lpSum(source_n.values()) + pulp.lpSum(vaporizer_n.values())

    if sanity:
        prob += total_profit
    elif mode == "balance":
        parts_weight = cfg.get("parts_weight", 0.01)
        prob += total_profit + parts_weight * parts_total - params["facility_penalty"] * total_facilities
    else:
        prob += total_profit - params["facility_penalty"] * total_facilities

    variables = {
        "recipe_rate": recipe_rate,
        "facility_n": facility_n,
        "gen_n": gen_n,
        "source_n": source_n,
        "vaporizer_n": vaporizer_n,
        "burn": burn_vars,
        "sales": sales_vars,
        "transfer": transfer_vars,
        "item_net": item_net,
        "total_profit": total_profit,
        "total_cons": total_cons,
        "total_gen": total_gen,
    }
    return prob, variables


def solve(prob, variables, cfg):
    """CBCで求解し、変数値を抽出した Solution を返す。"""
    params = _solver_params(cfg)
    prob.solve(pulp.PULP_CBC_CMD(msg=0, gapRel=params["gap_rel"], timeLimit=params["time_limit_sec"]))

    status = pulp.LpStatus[prob.status]
    if status in ("Infeasible", "Unbounded"):
        return Solution(status=status)

    profit = pulp.value(variables["total_profit"])
    if profit is None:
        return Solution(status=status)

    def val(x):
        v = pulp.value(x) if not isinstance(x, (int, float)) else x
        return v if v is not None else 0.0

    return Solution(
        status=status,
        profit=profit,
        sales={iid: val(v) for iid, v in variables["sales"].items()},
        recipe_rates={rid: val(v) for rid, v in variables["recipe_rate"].items()},
        facility_n={rid: val(v) for rid, v in variables["facility_n"].items()},
        burn={name: val(v) for name, v in variables["burn"].items()},
        generator_counts={name: val(v) for name, v in variables["gen_n"].items()},
        source_counts={iid: val(v) for iid, v in variables["source_n"].items()},
        vaporizer_counts={env: val(v) for env, v in variables["vaporizer_n"].items()},
        transfers={iid: val(v) for iid, v in variables["transfer"].items()},
        item_net={iid: val(v) for iid, v in variables["item_net"].items()},
        power_consumed=val(variables["total_cons"]),
        power_generated=val(variables["total_gen"]),
    )


def optimize(region, mode="balance", sanity=False, cfg_override=None, snapshot=False):
    """データ読込からSolution取得までの便宜関数。地域が未定義なら None を返す。"""
    master = data_access.load_master(snapshot=snapshot)
    cfg = cfg_override if cfg_override is not None else data_access.load_config()
    inputs = data_access.load_region_inputs(region, master, sanity=sanity)
    if inputs is None:
        return None
    prob, variables = build_model(master, cfg, inputs, mode=mode, sanity=sanity)
    return solve(prob, variables, cfg)


def item_flow(sol, master, item_id):
    """あるアイテムの発生元・消費先レシピを稼働中レシピから集計する。

    Returns:
        (produced, consumed): (レシピ名, 施設名, 台数, 量/min) タプルのリスト。
    """
    iid = str(item_id).strip()
    produced = []
    consumed = []
    for r in master['recipes']:
        rate = sol.recipe_rates.get(r['id'], 0)
        if rate <= 0.001:
            continue
        num = rate / (60 / r['time']) if r['time'] > 0 else 0
        for out in r.get('outputs', []):
            if str(out['id']).strip() == iid:
                produced.append((r['name'], r['facilityName'], num, out['amount'] * rate))
        for inp in r.get('inputs', []):
            if str(inp['id']).strip() == iid:
                consumed.append((r['name'], r['facilityName'], num, inp['amount'] * rate))
    return produced, consumed
