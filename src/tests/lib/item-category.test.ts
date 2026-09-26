import { describe, expect, test } from "vitest";

import {
  getMaterialCategory,
  getMaterialSubtype,
} from "@/lib/item-category";
import type { Item, ItemId } from "@/types";

const item = (
  id: string,
  extra: Partial<Omit<Item, "id" | "tier">> = {},
): Item => ({
  id: id as ItemId,
  tier: 1,
  ...extra,
});

describe("item category taxonomy", () => {
  test("groups raw resources and gathered items into broad wiki-style buckets", () => {
    expect(getMaterialCategory(item("item_iron_ore"))).toBe("natural");
    expect(getMaterialCategory(item("item_quartz_sand"))).toBe("natural");
    expect(getMaterialCategory(item("item_plant_grass_1"))).toBe("gathered");
    expect(getMaterialCategory(item("item_plant_grass_seed_1"))).toBe(
      "gathered",
    );
  });

  test("keeps factory products under industrial while preserving useful subtypes", () => {
    expect(getMaterialCategory(item("item_iron_powder"))).toBe("industrial");
    expect(getMaterialSubtype(item("item_iron_powder"))).toBe("powder");

    expect(getMaterialCategory(item("item_iron_cmpt"))).toBe("industrial");
    expect(getMaterialSubtype(item("item_iron_cmpt"))).toBe("component");

    expect(
      getMaterialCategory(item("item_liquid_xiranite", { isLiquid: true })),
    ).toBe("industrial");
    expect(
      getMaterialSubtype(item("item_liquid_xiranite", { isLiquid: true })),
    ).toBe("liquid");
  });

  test("classifies consumables and event items separately", () => {
    expect(getMaterialCategory(item("item_bottled_rec_hp_1"))).toBe(
      "consumable",
    );
    expect(getMaterialSubtype(item("item_bottled_rec_hp_1"))).toBe(
      "medicine",
    );
    expect(getMaterialCategory(item("item_activity_xiranite_nugget"))).toBe(
      "event",
    );
  });
});
