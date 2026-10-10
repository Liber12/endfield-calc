import json
import os
from dataclasses import dataclass, field

import pandas as pd

from utils import normalize_name

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SRC_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
CONFIG_DIR = os.path.join(PROJECT_ROOT, 'config')


def load_master(snapshot=False):
    """Use the current checked-in calculator sources by default.

    The v0.6.2 snapshot remains available only for historical regression
    comparison; it must never silently stand in for today's game data.
    """
    if not snapshot:
        from master_converter import build_master
        return build_master(PROJECT_ROOT)
    with open(os.path.join(DATA_DIR, 'master_data.json'), 'r', encoding='utf-8-sig') as f:
        return json.load(f)


def load_config():
    with open(os.path.join(CONFIG_DIR, 'optimizer_config.json'), 'r', encoding='utf-8') as f:
        return json.load(f)


@dataclass
class RegionInputs:
    """地域ごとの外生入力(価格・資源供給・発電・施設上限)をまとめたもの。"""
    region: str
    item_prices: dict = field(default_factory=dict)       # normalize済み名 -> 最高単価
    resource_limits: dict = field(default_factory=dict)   # normalize済み名 -> 産出量/min
    gen_supply_per_unit: dict = field(default_factory=dict)  # normalize済み燃料名 -> 発電量(W·min/個)
    gen_seconds: dict = field(default_factory=dict)        # normalize済み燃料名 -> 燃焼秒数
    facility_limits: dict = field(default_factory=dict)    # facilityId -> 設置上限台数
    outpost_offers: dict = field(default_factory=dict)       # outpost -> normalized Japanese item name -> price
    outpost_budget_per_min: dict = field(default_factory=dict)  # outpost -> sustainable baseline bills/min
    outpost_levels: dict = field(default_factory=dict)       # selected prosperity stage per outpost


def load_region_inputs(region, master, sanity=False, cfg=None):
    """config/ 以下のCSVから地域の入力データを組み立てる。地域が resources.csv に無ければ None。"""
    outpost_prices_df = pd.read_csv(os.path.join(CONFIG_DIR, 'outpost_prices.csv'))
    all_resources_df = pd.read_csv(os.path.join(CONFIG_DIR, 'resources.csv'))
    generator_df = pd.read_csv(os.path.join(CONFIG_DIR, 'generator_stats.csv'))

    resources_df = all_resources_df[all_resources_df['地域'] == region]
    if resources_df.empty:
        return None

    item_prices = {}
    for _, row in outpost_prices_df[outpost_prices_df['地域'] == region].iterrows():
        name = normalize_name(row['アイテム名'])
        if name not in item_prices or row['単価'] > item_prices[name]:
            item_prices[name] = row['単価']

    outpost_offers = {}
    outpost_budget_per_min = {}
    selected_levels = {}
    if master.get("sourceVersion"):
        with open(os.path.join(CONFIG_DIR, "outposts_1_5.json"), encoding="utf-8") as handle:
            outpost_catalog = json.load(handle)
        if outpost_catalog["gameVersion"] != "1.5":
            raise ValueError("Expected a verified 1.5 outpost economy catalog")
        cfg = cfg or load_config()
        configured_levels = cfg.get("outpost_levels", {})
        region_posts = [entry for entry in outpost_catalog["outposts"] if entry["region"] == region]
        source_names = set()
        for entry in region_posts:
            name = entry["name"]
            level = int(configured_levels.get(name, len(entry["levels"])))
            if level < 0 or level > len(entry["levels"]):
                raise ValueError(f"Invalid outpost stage {name}: {level}")
            selected_levels[name] = level
            if level == 0:
                continue
            source_names.add(name)
            outpost_budget_per_min[name] = entry["levels"][level - 1] / 60.0
            offers = {}
            for _, row in outpost_prices_df[
                (outpost_prices_df["地域"] == region)
                & (outpost_prices_df["拠点名"] == name)
                & (outpost_prices_df["発展段階"] <= level)
            ].iterrows():
                item_name = normalize_name(row["アイテム名"])
                offers[item_name] = max(float(row["単価"]), offers.get(item_name, 0))
            if not offers:
                raise ValueError(f"No tradable items for active outpost {name} at stage {level}")
            outpost_offers[name] = offers
        unexpected = set(outpost_prices_df[outpost_prices_df["地域"] == region]["拠点名"]) - {post["name"] for post in region_posts}
        if unexpected:
            raise ValueError(f"Outpost price rows missing verified budget data: {sorted(unexpected)}")
        known_items = {normalize_name(it["name"]) for it in master["items"].values()}
        for name, offers in outpost_offers.items():
            unknown = set(offers) - known_items
            if unknown:
                raise ValueError(f"Outpost {name} has unrecognized tradable items: {sorted(unknown)}")

    if master.get("sourceVersion"):
        # Default mining caps and availability come from the same current
        # source maps as the web calculator, not historical resources.csv.
        domain = {"四号谷地": "domain_1", "武陵": "domain_2"}.get(region)
        if domain is None:
            raise ValueError(f"Current game domain mapping missing for {region}")
        allowed = master["regionalRawAvailability"][domain]
        caps = master["regionalRawCaps"][domain]
        legacy = {normalize_name(k): v for k, v in zip(resources_df['資源名'], resources_df['産出量(/min)'])}
        resource_limits = {}
        for iid in allowed:
            it = master["items"][iid]
            name = normalize_name(it["name"])
            if iid in caps:
                resource_limits[name] = caps[iid]
            elif it["isLiquid"]:
                # Pumped liquids enter via explicit source-machine variables.
                resource_limits[name] = 0
            else:
                # Non-node gatherable raws are scenario inputs, not free
                # unlimited imports. Preserve user-configured manual supply.
                resource_limits[name] = float(legacy.get(name, 0))
    else:
        resource_limits = {normalize_name(k): v for k, v in zip(resources_df['資源名'], resources_df['産出量(/min)'])}

    if sanity:
        resource_limits = {name: 0 for name in resource_limits}

    gen_supply_per_unit = {normalize_name(row['アイテム名']): (row['発電量'] * row['秒数']) / 60 for _, row in generator_df.iterrows()}
    gen_seconds = {normalize_name(row['アイテム名']): row['秒数'] for _, row in generator_df.iterrows()}

    if master.get("sourceVersion"):
        # No direct ore burning: the web calculator's Thermal Bank supports
        # only powerFuels declared in generated power.ts.
        gen_supply_per_unit = {}
        gen_seconds = {}
        for iid, info in master["powerFuels"].items():
            name = normalize_name(master["items"][iid]["name"])
            gen_seconds[name] = info["seconds"]
            gen_supply_per_unit[name] = info["powerGeneration"] * info["seconds"] / 60

    facility_limits = {}
    fac_limits_path = os.path.join(CONFIG_DIR, 'facility_limits.csv')
    if os.path.exists(fac_limits_path):
        fac_limits_df = pd.read_csv(fac_limits_path)
        facility_limits = {row['ID']: row['上限'] for _, row in fac_limits_df.iterrows()}

    if master.get("sourceVersion"):
        # Current fully-unlocked facility maxima supersede stale legacy CSV
        # ids (item_port_...). Base caps + AIC capRaise + map instances.
        domain = {"四号谷地": "domain_1", "武陵": "domain_2"}[region]
        facility_limits = dict(master["facilityMaxCapsByDomain"].get(domain, {}))

    return RegionInputs(
        region=region,
        item_prices=item_prices,
        resource_limits=resource_limits,
        gen_supply_per_unit=gen_supply_per_unit,
        gen_seconds=gen_seconds,
        facility_limits=facility_limits,
        outpost_offers=outpost_offers,
        outpost_budget_per_min=outpost_budget_per_min,
        outpost_levels=selected_levels,
    )
