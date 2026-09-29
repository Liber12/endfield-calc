import { describe, expect, test } from "vitest";

import { runCalculation } from "@/core";
import { ItemId, RecipeId } from "@/types/constants";

describe("calculation core service", () => {
  test("plan command solves without any interface dependency", async () => {
    const result = await runCalculation({
      command: "plan",
      targets: [{ itemId: ItemId.ITEM_IRON_POWDER, rate: 30 }],
    });

    expect(result.command).toBe("plan");
    expect(result.optimizer).toBeUndefined();
    expect(result.prunedTargets).toEqual([]);
    expect(result.plan.lpStatus).toBe("ok");
    expect(result.plan.nodes.has(ItemId.ITEM_IRON_POWDER)).toBe(true);
    expect(result.plan.nodes.has(RecipeId.GRINDER_IRON_POWDER_1)).toBe(true);
  });

  test("fit command keeps command semantics inside core", async () => {
    const result = await runCalculation({
      command: "fit",
      targets: [{ itemId: ItemId.ITEM_IRON_POWDER, rate: 30 }],
    });

    expect(result.command).toBe("fit");
    expect(result.optimizer).toBeDefined();
    expect(result.plan.lpStatus).toBe("ok");
  });

  test("max validates that the selected item is a calculable target", async () => {
    await expect(
      runCalculation({
        command: "max",
        targets: [{ itemId: ItemId.ITEM_IRON_POWDER, rate: 30 }],
        maxItemId: ItemId.ITEM_QUARTZ_SAND,
      }),
    ).rejects.toThrow("Max target is not in the calculable target list");
  });
});
