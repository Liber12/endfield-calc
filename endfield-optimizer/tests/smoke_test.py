"""リグレッション検知用スモークテスト。実行: python tests/smoke_test.py (依存: pytest不要)"""
import copy
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))

import data_access
import model
from utils import setup_console

setup_console()


def test_master_data_counts():
    """TSパーサ・ETLの退行検知: マスターデータの件数が下限を割っていないこと。"""
    master = data_access.load_master()
    assert len(master['items']) >= 170, f"items が少なすぎます: {len(master['items'])}"
    assert len(master['recipes']) >= 250, f"recipes が少なすぎます: {len(master['recipes'])}"
    assert len(master['facilities']) >= 15, f"facilities が少なすぎます: {len(master['facilities'])}"
    print(f"  [OK] master data: items={len(master['items'])}, recipes={len(master['recipes'])}, facilities={len(master['facilities'])}")


def test_solver_optimal():
    """武陵 balance が最適解に到達し、現実的な収益を出すこと。"""
    sol = model.optimize("武陵", mode="balance")
    assert sol is not None, "地域 武陵 の入力データが読み込めませんでした"
    assert sol.status == "Optimal", f"ステータスが Optimal ではありません: {sol.status}"
    assert sol.profit > 1000, f"収益が想定より低すぎます: {sol.profit}"
    assert sol.power_generated >= sol.power_consumed - 0.01, "電力収支が破綻しています"
    print(f"  [OK] solver optimal: profit={sol.profit:,.2f} 券/分")


def test_known_good_profit_without_transfer():
    """既知良好値との一致: 無在庫転送なしの武陵 balance は 1126.75 券/分。"""
    cfg = copy.deepcopy(data_access.load_config())
    cfg.setdefault("transfer_rules", {})["enabled"] = False
    sol = model.optimize("武陵", mode="balance", cfg_override=cfg)
    assert sol is not None and sol.status == "Optimal", f"求解失敗: {sol and sol.status}"
    assert abs(sol.profit - 1126.75) < 0.5, f"転送なし収益が既知値 1126.75 とずれています: {sol.profit}"
    print(f"  [OK] known-good profit (no transfer): {sol.profit:,.2f} 券/分")


if __name__ == "__main__":
    tests = [test_master_data_counts, test_solver_optimal, test_known_good_profit_without_transfer]
    print("=== smoke test ===")
    failed = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            failed += 1
            print(f"  [FAIL] {t.__name__}: {e}")
    if failed:
        print(f"=== {failed}/{len(tests)} 件失敗 ===")
        sys.exit(1)
    print(f"=== 全 {len(tests)} 件成功 ===")
