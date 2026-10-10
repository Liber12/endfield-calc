import json
import os
from dataclasses import dataclass, field

import pandas as pd

from utils import normalize_name

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SRC_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
CONFIG_DIR = os.path.join(PROJECT_ROOT, 'config')


def load_master():
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


def load_region_inputs(region, master, sanity=False):
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

    if sanity:
        # サニティチェック: 天然資源の供給を全て0にして「無から利益が湧かないか」を検証する
        resource_limits = {normalize_name(it['name']): 0 for iid, it in master['items'].items() if it['isRaw']}
    else:
        resource_limits = {normalize_name(k): v for k, v in zip(resources_df['資源名'], resources_df['産出量(/min)'])}

    gen_supply_per_unit = {normalize_name(row['アイテム名']): (row['発電量'] * row['秒数']) / 60 for _, row in generator_df.iterrows()}
    gen_seconds = {normalize_name(row['アイテム名']): row['秒数'] for _, row in generator_df.iterrows()}

    facility_limits = {}
    fac_limits_path = os.path.join(CONFIG_DIR, 'facility_limits.csv')
    if os.path.exists(fac_limits_path):
        fac_limits_df = pd.read_csv(fac_limits_path)
        facility_limits = {row['ID']: row['上限'] for _, row in fac_limits_df.iterrows()}

    return RegionInputs(
        region=region,
        item_prices=item_prices,
        resource_limits=resource_limits,
        gen_supply_per_unit=gen_supply_per_unit,
        gen_seconds=gen_seconds,
        facility_limits=facility_limits,
    )
