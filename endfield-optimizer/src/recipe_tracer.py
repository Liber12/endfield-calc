import sys

import data_access
from utils import setup_console

def trace_backward(master, item_id, indent=0, visited=None, global_visited=None, depth=0, max_depth=10, suppressed_facilities=()):
    """材料を遡るツリー表示"""
    if visited is None: visited = set()
    if global_visited is None: global_visited = set()

    item = master['items'].get(item_id, {"name": item_id})

    if depth > max_depth:
        print(f"{'  ' * indent}> {item['name']} [深度制限により停止]")
        return

    if item_id in visited:
        print(f"{'  ' * indent}> {item['name']} [循環参照のため省略]")
        return

    if item_id in global_visited:
        print(f"{'  ' * indent}> {item['name']} (既出につき省略)")
        return

    print(f"{'  ' * indent}> {item['name']}")
    visited.add(item_id)
    global_visited.add(item_id)

    # このアイテムを作る全レシピを取得
    candidate_recipes = [r for r in master['recipes'] if any(o['id'] == item_id for o in r['outputs'])]

    # 【ループ抑止】抑止対象施設(config: tracer.loop_suppressed_facilities)以外のレシピがあればそちらを優先する
    # これにより「ボトル <- 解体 <- ボトル入り <- 充填 <- ボトル」の無意味なループを防ぐ
    productive_recipes = [r for r in candidate_recipes if r['facilityName'] not in suppressed_facilities]
    if productive_recipes:
        display_recipes = productive_recipes
    else:
        display_recipes = candidate_recipes

    # あまりに多い場合は制限（ボトリングなどの重複回避）
    max_recipes_per_item = 2
    for i, r in enumerate(display_recipes):
        if i >= max_recipes_per_item:
            print(f"{'  ' * (indent+1)} ... 他 {len(display_recipes) - max_recipes_per_item} 件のレシピを省略")
            break
        print(f"{'  ' * (indent+1)} <- [{r['facilityName']}] {r['id']}")
        for inp in r['inputs']:
            trace_backward(master, inp['id'], indent + 2, visited.copy(), global_visited, depth + 1, max_depth, suppressed_facilities)

def trace_forward(master, item_id, indent=0, visited=None, global_visited=None, depth=0, max_depth=10):
    """用途（何に使えるか）を辿るツリー表示"""
    if visited is None: visited = set()
    if global_visited is None: global_visited = set()

    item = master['items'].get(item_id, {"name": item_id})

    if depth > max_depth:
        print(f"{'  ' * indent}> {item['name']} [深度制限により停止]")
        return

    if item_id in visited:
        print(f"{'  ' * indent}> {item['name']} [循環参照のため省略]")
        return

    if item_id in global_visited:
        print(f"{'  ' * indent}> {item['name']} (既出につき省略)")
        return

    print(f"{'  ' * indent}> {item['name']}")
    visited.add(item_id)
    global_visited.add(item_id)

    # このアイテムを消費するレシピを取得
    candidate_recipes = [r for r in master['recipes'] if any(i['id'] == item_id for i in r['inputs'])]

    max_recipes_per_item = 2
    found = False
    for i, r in enumerate(candidate_recipes):
        found = True
        if i >= max_recipes_per_item:
            print(f"{'  ' * (indent+1)} ... 他 {len(candidate_recipes) - max_recipes_per_item} 件の用途を省略")
            break
        main_out = r['outputs'][0]['name'] if r['outputs'] else "不明"
        print(f"{'  ' * (indent+1)} -> [{r['facilityName']}] {r['id']} (製品: {main_out})")
        for out in r['outputs']:
            trace_forward(master, out['id'], indent + 2, visited.copy(), global_visited, depth + 1, max_depth)

    if not found and indent == 0:
        print("  (用途が見つかりませんでした)")

def main():
    master = data_access.load_master()
    cfg = data_access.load_config()
    suppressed = tuple(cfg.get("tracer", {}).get("loop_suppressed_facilities", []))
    if len(sys.argv) < 2:
        print("Usage: python recipe_tracer.py [アイテム名/ID] [-f (用途トレース)]")
        return

    target = sys.argv[1]
    forward = "-f" in sys.argv

    # 名称からIDを特定
    target_id = None
    for iid, it in master['items'].items():
        if it['name'] == target or iid == target:
            target_id = iid; break

    if not target_id:
        print(f"アイテム '{target}' が見つかりませんでした。")
        return

    print("=" * 60)
    if forward:
        print(f"  【用途トレース】 {master['items'][target_id]['name']} は何に使えるか？")
        print("=" * 60)
        trace_forward(master, target_id)
    else:
        print(f"  【材料トレース】 {master['items'][target_id]['name']} は何からできているか？")
        print("=" * 60)
        trace_backward(master, target_id, suppressed_facilities=suppressed)
    print("=" * 60)

if __name__ == "__main__":
    setup_console()
    main()
