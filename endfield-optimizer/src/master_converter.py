import re
import json
import csv
import os
import sys
import argparse

from utils import parse_ts_or_exit, setup_console


def load_sources(base_root):
    """endfield-calc の .ts データと日本語ロケールを読み込む。"""
    calc_path = base_root
    data_path = os.path.join(calc_path, 'src', 'data')
    ja_path = os.path.join(calc_path, 'public', 'locales', 'ja')

    with open(os.path.join(ja_path, 'item.json'), 'r', encoding='utf-8') as f: item_names = json.load(f)
    with open(os.path.join(ja_path, 'facility.json'), 'r', encoding='utf-8') as f: facility_names = json.load(f)

    facilities = parse_ts_or_exit(os.path.join(data_path, 'facilities.ts'))
    recipes = parse_ts_or_exit(os.path.join(data_path, 'recipes.ts'))
    items = parse_ts_or_exit(os.path.join(data_path, 'items.ts'))

    with open(os.path.join(data_path, 'index.ts'), 'r', encoding='utf-8') as f: index_content = f.read()
    raw_match = re.search(r'forcedRawMaterials = new Set<ItemId>\(\[(.*?)\]\)', index_content, re.DOTALL)
    if raw_match is None:
        raw_match = re.search(r'const rawMaterialSources = new Map<ItemId, RawSourceConfig>\(\[(.*?)\]\);', index_content, re.DOTALL)
    if raw_match is None:
        raise ValueError('Cannot find raw material declarations in src/data/index.ts')
    raw_materials = re.findall(r'"(item_\w+)"', raw_match.group(1))
    disposal_items = re.findall(r'"(item_\w+)"', re.search(r'forcedDisposalItems = new Set<ItemId>\(\[(.*?)\]\)', index_content, re.DOTALL).group(1))

    return item_names, facility_names, facilities, recipes, items, raw_materials, disposal_items


def build_master(project_root, source_root=None):
    """全ソースを統合して master dict を構築する。仮想施設・レシピは config/virtual_entities.json から取り込む。"""
    base_root = source_root or os.path.dirname(project_root)
    item_names, facility_names, facilities, recipes, items, raw_materials, disposal_items = load_sources(base_root)

    with open(os.path.join(project_root, 'config', 'virtual_entities.json'), 'r', encoding='utf-8') as f:
        virtual = json.load(f)

    master = {"items": {}, "recipes": [], "facilities": {}}

    for it in items:
        iid = it['id']
        master["items"][iid] = {
            "name": item_names.get(iid, iid),
            "tier": it.get('tier', 1),
            "isLiquid": 1 if it.get('isLiquid') else 0,
            "isRaw": 1 if iid in raw_materials else 0,
            "isDisposal": 1 if iid in disposal_items else 0
        }

    for fac in facilities:
        fid = fac['id']
        master["facilities"][fid] = {
            "name": facility_names.get(fid, fid),
            "power": fac.get('powerConsumption', 0),
            "tier": fac.get('tier', 1)
        }
    master["facilities"].update(virtual.get("facilities", {}))

    # --- Integrity Guard Phase ---
    warnings = []
    for r in recipes:
        fid = r.get('facilityId', '')
        rid = r['id']

        if fid and fid not in master["facilities"]:
            warnings.append(f"[Invalid Facility] レシピ {rid} が未定義の施設 {fid} を参照しています。")

        inputs = r.get('inputs', [])
        outputs = r.get('outputs', [])
        if not inputs:
            warnings.append(f"[Empty Input] レシピ {rid} の入力が空です。パースミスの可能性があります。")
        if not outputs and not all(inp.get('itemId') in disposal_items for inp in inputs):
            warnings.append(f"[Empty Output] レシピ {rid} の出力が空です。")

        for inp in inputs:
            if inp['itemId'] not in master["items"]:
                warnings.append(f"[Unknown Item] レシピ {rid} が未知の材料ID {inp['itemId']} を参照しています。")
        for out in outputs:
            if out['itemId'] not in master["items"]:
                warnings.append(f"[Unknown Item] レシピ {rid} が未知の製品ID {out['itemId']} を参照しています。")

        if r.get('craftingTime', 0) <= 0:
            warnings.append(f"[Zero Time] レシピ {rid} の製作時間が0以下です。")

    if warnings:
        print("\n!!! データ整合性警告 (Integrity Guard) !!!")
        for w in warnings[:10]: print(f"  {w}")
        if len(warnings) > 10: print(f"  ...他 {len(warnings)-10} 件の警告")
        print("-" * 40)

    # Build Output Objects
    for r in recipes:
        fid = r.get('facilityId', '')
        recipe_obj = {
            "id": r['id'], "name": "", "facilityId": fid,
            "facilityName": master["facilities"].get(fid, {}).get("name", fid),
            "time": r.get('craftingTime', 0), "inputs": [], "outputs": []
        }
        for inp in r.get('inputs', []):
            recipe_obj["inputs"].append({"id": inp['itemId'], "name": master["items"].get(inp['itemId'], {}).get("name", inp['itemId']), "amount": inp['amount']})
        for out in r.get('outputs', []):
            recipe_obj["outputs"].append({"id": out['itemId'], "name": master["items"].get(out['itemId'], {}).get("name", out['itemId']), "amount": out['amount']})
        if recipe_obj["outputs"]:
            recipe_obj["name"] = recipe_obj["outputs"][0]["name"]
        elif recipe_obj["inputs"]:
            recipe_obj["name"] = f"{recipe_obj['inputs'][0]['name']}処理"
        else:
            recipe_obj["name"] = r['id']
        master["recipes"].append(recipe_obj)

    master["recipes"].extend(virtual.get("recipes", []))
    return master


def write_csvs(master, output_path):
    """人間向けリファレンスとして master と同内容の3CSVを出力する。"""
    with open(os.path.join(output_path, 'facilities_ja.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', '日本語名', '消費電力', 'ティア'])
        for fid, fac in master['facilities'].items():
            writer.writerow([fid, fac['name'], fac['power'], fac['tier']])

    with open(os.path.join(output_path, 'items_ja.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', '日本語名', 'ティア', '液体フラグ', '原材料', '廃棄物'])
        for iid, it in master['items'].items():
            writer.writerow([iid, it['name'], it['tier'], '1' if it['isLiquid'] else '0', '1' if it['isRaw'] else '0', '1' if it['isDisposal'] else '0'])

    max_inputs = max(len(r['inputs']) for r in master['recipes'])
    max_outputs = max(len(r['outputs']) for r in master['recipes'])

    headers = ['ID', '表示名', '施設ID', '施設名', '製作時間(秒)']
    for i in range(1, max_inputs + 1):
        headers.extend([f'入力{i}_ID', f'入力{i}_名', f'数量{i}'])
    for i in range(1, max_outputs + 1):
        headers.extend([f'出力{i}_ID', f'出力{i}_名', f'数量{i}'])

    with open(os.path.join(output_path, 'recipes_ja.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for r in master['recipes']:
            row = [r['id'], r['name'], r['facilityId'], r['facilityName'], r['time']]
            for i in range(max_inputs):
                if i < len(r['inputs']):
                    inp = r['inputs'][i]
                    row.extend([inp['id'], inp['name'], inp['amount']])
                else:
                    row.extend(['', '', ''])
            for i in range(max_outputs):
                if i < len(r['outputs']):
                    out = r['outputs'][i]
                    row.extend([out['id'], out['name'], out['amount']])
                else:
                    row.extend(['', '', ''])
            writer.writerow(row)


def main():
    setup_console()
    parser = argparse.ArgumentParser(description='Build optimizer data from the calculator source.')
    parser.add_argument('--source-root', help='Calculator root (defaults to the repository root).')
    parser.add_argument('--output-dir', help='Output directory (defaults to optimizer/data).')
    parser.add_argument('--csv', action='store_true', help='Also write reference CSV files.')
    args = parser.parse_args()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    master = build_master(project_root, args.source_root)
    output_dir = args.output_dir or os.path.join(project_root, 'data')
    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, 'master_data.json')
    with open(output_file, 'w', encoding='utf-8-sig') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)
    print(f"Master data JSON created successfully: {output_file}")

    if args.csv:
        write_csvs(master, output_dir)
        print("Reference CSV files created successfully.")


if __name__ == "__main__":
    main()
