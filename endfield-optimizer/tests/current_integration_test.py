"""Check the current-source MILP, not just its isolated constraints."""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import data_access
import model
from utils import normalize_name


def main():
    master = data_access.load_master()
    assert master["sourceVersion"] == "0.10.0"
    preview = {
        "sourceVersion": master["sourceVersion"],
        "gameEconomicVersion": "1.5",
        "asOf": "2026-10-10",
        "scenario": "all outposts at level 4, no defense/liaison bonus, no spatial placement, approximate single-recipe facilities",
        "regions": {},
    }
    summary_lines = [
        "# 2026-10-10 ゲームVer.1.5 生産・拠点取引最適化（暫定）",
        "",
        "**注意:** 工場データはWeb計算機v0.10.0（主に1.4系）から生成しています。",
        "本計算は拠点の基礎券補充量・設備・原料・ガス・電力・転送の制約内です。",
        "実際の配置・研究進捗・ボーナス・時点の残高による実現可能性を保証しません。",
        "",
    ]
    for region in ("武陵", "四号谷地"):
        answer = model.optimize(region, mode="profit")
        print(f"{region}: {answer.status}, profit={answer.profit}")
        assert answer.is_usable, f"{region}: {answer.status}"
        assert answer.power_consumed <= answer.power_generated + 0.02
        for iid, rate in answer.source_counts.items():
            assert rate >= -0.000001, (iid, rate)
        assert answer.profit >= -0.000001
        inputs = data_access.load_region_inputs(region, master)
        assert len(inputs.outpost_offers) == 3, (region, inputs.outpost_offers.keys())
        assert len(answer.outpost_income) == 3
        assert abs(sum(answer.outpost_income.values()) - answer.profit) < 0.01
        for post, income in answer.outpost_income.items():
            assert income >= -0.0001
            assert income <= inputs.outpost_budget_per_min[post] + 0.001, (post, income)
        region_budget = sum(inputs.outpost_budget_per_min.values())
        assert answer.profit <= region_budget + 0.01
        print(f"  Sustainable base stock-bill ceiling: {region_budget:,.2f} /min")
        posts = {}
        summary_lines += [f"## {region}", "", f"基礎券補充量モデルの最適値：**{answer.profit:,.2f} 券/分**", ""]
        for post, offers in answer.outpost_sales.items():
            products = []
            for iid, amount in offers.items():
                if amount <= 0.0001:
                    continue
                name = master["items"][iid]["name"]
                price = inputs.outpost_offers[post][normalize_name(name)]
                products.append({
                    "itemId": iid, "itemName": name, "unitsPerMinute": amount,
                    "price": price, "stockBillsPerMinute": amount * price,
                })
            products.sort(key=lambda x: -x["stockBillsPerMinute"])
            posts[post] = {
                "stage": inputs.outpost_levels[post],
                "incomePerMinute": answer.outpost_income[post],
                "budgetPerMinute": inputs.outpost_budget_per_min[post],
                "products": products,
            }
            summary_lines += [f"### {post}（Lv.{inputs.outpost_levels[post]}）",
                              f"収入: {answer.outpost_income[post]:,.2f} / {inputs.outpost_budget_per_min[post]:,.2f} 券/分",
                              ""]
            for item in products:
                summary_lines.append(
                    f"- {item['itemName']}: {item['unitsPerMinute']:.2f}個/分 × {item['price']}券 = {item['stockBillsPerMinute']:.2f}券/分"
                )
            summary_lines.append("")
        recipes = [
            {"recipeId": r["id"], "name": r["name"], "facilityId": r["facilityId"],
             "facilityName": r["facilityName"],
             "machines": answer.facility_n[r["id"]],
             "runsPerMinute": answer.recipe_rates[r["id"]]}
            for r in master["recipes"] if answer.recipe_rates[r["id"]] > 0.0001
        ]
        recipes.sort(key=lambda x: (-x["machines"], x["recipeId"]))
        preview["regions"][region] = {
            "status": answer.status, "profitBillsPerMinute": answer.profit,
            "outposts": posts, "facilities": recipes,
            "powerConsumedW": answer.power_consumed,
            "powerGeneratedW": answer.power_generated,
            "sourcePumpCounts": answer.source_counts,
            "vaporizerCounts": answer.vaporizer_counts,
            "transfersPerMinute": answer.transfers,
            "resourceCapsPerMinute": inputs.resource_limits,
        }
        summary_lines += ["### 稼働設備とレシピ（モデル内の整数設備台数）", ""]
        for recipe in recipes:
            summary_lines.append(
                f"- {recipe['facilityName']} ×{recipe['machines']:.0f}: "
                f"{recipe['name']}（{recipe['runsPerMinute']:.2f}回/分）"
            )
        summary_lines += [""]

    report_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "reports")
    os.makedirs(report_dir, exist_ok=True)
    with open(os.path.join(report_dir, "current_plan_1_5.json"), "w", encoding="utf-8") as file:
        json.dump(preview, file, ensure_ascii=False, indent=2)
    with open(os.path.join(report_dir, "current_plan_1_5.md"), "w", encoding="utf-8") as file:
        file.write("\n".join(summary_lines) + "\n")
    cfg = data_access.load_config()
    cfg["outpost_levels"] = {"満天台建設基地": 0}
    closed = model.optimize("武陵", mode="profit", cfg_override=cfg)
    assert closed.is_usable, closed.status
    assert "満天台建設基地" not in closed.outpost_income
    assert closed.profit <= (30000 + 22800) / 60 + 0.01, closed.profit


if __name__ == "__main__":
    main()
