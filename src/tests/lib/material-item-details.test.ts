import { describe, expect, test } from "vitest";

import { items } from "@/data/items";
import {
  getMaterialItemDetail,
  materialItemDetails,
} from "@/data/material-item-details";
import type { ItemId } from "@/types";

describe("material item details", () => {
  test("all generated detail IDs exist in the calculator item roster", () => {
    const roster = new Set(items.map((item) => item.id));
    const missing = Object.keys(materialItemDetails).filter(
      (itemId) => !roster.has(itemId as ItemId),
    );
    expect(missing).toEqual([]);
  });

  test("includes both descriptions and functional effects", () => {
    expect(Object.keys(materialItemDetails).length).toBeGreaterThan(100);

    const ore = getMaterialItemDetail("item_originium_ore" as ItemId);
    expect(ore?.kind).toBe("description");
    expect(ore?.text.length).toBeGreaterThan(10);

    const medicine = getMaterialItemDetail("item_bottled_rec_hp_1" as ItemId);
    expect(medicine?.kind).toBe("effect");
    expect(medicine?.text).toContain("HP");
  });
});
