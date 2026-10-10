import re
import json
import sys
import unicodedata


# --- コンソール / テキスト共通 ---

def setup_console():
    """Windowsコンソール・リダイレクト先で日本語がUTF-8で出力されるようにする。全CLIの冒頭で呼ぶ。"""
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')


def get_width(text):
    """東アジア文字幅(全角=2)での表示幅。曖昧幅(A)は日本語コンソールに合わせ全角扱い。"""
    return sum(2 if unicodedata.east_asian_width(c) in "WFA" else 1 for c in text)


def pad_right(text, target_width):
    text = str(text)
    return text + " " * max(0, target_width - get_width(text))


def pad_left(text, target_width):
    text = str(text)
    return " " * max(0, target_width - get_width(text)) + text


def normalize_name(n):
    """表記揺れ(空白・ローマ数字)を吸収した名前照合キーを返す。"""
    return str(n).strip().replace(" ", "").replace("　", "").replace("Ⅰ", "1").replace("Ⅱ", "2").replace("I", "1").replace("II", "2")


# --- TSデータ抽出 ---

def parse_ts_to_list(file_path, export_name=None):
    """endfield-calc の .ts データファイルから配列リテラルを抽出して dict のリストにする。

    Returns:
        (objects, errors): errors はJSON変換に失敗したオブジェクト断片のリスト。
        呼び出し側は errors が空でないとき欠落として扱い、処理を中断すること。
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(r'//.*', '', content)

    # Stop at the exported array's closing `];`, not the last bracket in a file
    # containing subsequent TS exports (e.g. region-subsystems.ts).
    if export_name:
        array_match = re.search(r'export\s+const\s+' + re.escape(export_name) + r'[^=]*=\s*\[(.*?)\];', content, re.DOTALL)
    else:
        array_match = re.search(r'=\s*\[(.*?)\];', content, re.DOTALL)
    if not array_match:
        return [], [f"{file_path}: 配列リテラル '= [ ... ]' が見つかりません"]

    array_content = array_match.group(1)

    objects = []
    errors = []
    stack = []
    start_index = -1

    for i, char in enumerate(array_content):
        if char == '{':
            if not stack:
                start_index = i
            stack.append('{')
        elif char == '}':
            if stack:
                stack.pop()
                if not stack:
                    obj_str = array_content[start_index:i + 1]

                    # TS → JSON 変換: キーを引用符で囲み、enum参照を文字列化し、末尾カンマを除去
                    obj_str = re.sub(r'(\s+)(\w+):', r'\1"\2":', obj_str)
                    obj_str = re.sub(r'(ItemId|FacilityId|RecipeId|DomainId)\.(\w+)', lambda x: f'"{x.group(2).lower()}"', obj_str)
                    obj_str = re.sub(r',\s*\}', '}', obj_str)
                    obj_str = re.sub(r',\s*\]', ']', obj_str)

                    try:
                        objects.append(json.loads(obj_str))
                    except json.JSONDecodeError as e:
                        errors.append(f"{e}: {obj_str[:120]}")
    return objects, errors


def parse_ts_or_exit(file_path, export_name=None):
    """parse_ts_to_list のラッパー。1件でも変換に失敗したら件数と先頭断片を表示して終了する。"""
    objects, errors = parse_ts_to_list(file_path, export_name=export_name)
    if errors:
        print(f"[FATAL] TSパース失敗: {file_path} で {len(errors)} 件のオブジェクトを変換できませんでした。")
        print(f"  先頭のエラー: {errors[0]}")
        sys.exit(1)
    return objects
