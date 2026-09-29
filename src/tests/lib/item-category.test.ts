import { describe, expect, test } from "vitest";

import {
  getMaterialCategory,
  getMaterialGroup,
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

  test("splits broad buckets into nearby material groups", () => {
    expect(getMaterialGroup(item("item_iron_ore"))).toBe("rawOre");
    expect(
      getMaterialGroup(item("item_liquid_water", { isLiquid: true })),
    ).toBe("rawLiquid");
    expect(getMaterialGroup(item("item_gas_inert", { isGas: true }))).toBe(
      "rawGas",
    );
    expect(getMaterialGroup(item("item_plant_grass_1"))).toBe("plant");
    expect(getMaterialGroup(item("item_plant_grass_seed_1"))).toBe("seed");
    expect(getMaterialGroup(item("item_iron_powder"))).toBe("powder");
    expect(getMaterialGroup(item("item_iron_mtl"))).toBe("refined");
    expect(
      getMaterialGroup(item("item_liquid_xiranite", { isLiquid: true })),
    ).toBe("industrialLiquid");
    expect(
      getMaterialGroup(item("item_gas_demo", { isGas: true })),
    ).toBe("industrialGas");
    expect(getMaterialGroup(item("item_glass_bottle"))).toBe("container");
    expect(getMaterialGroup(item("item_fbottle_glass_water"))).toBe(
      "filledContainer",
    );
    expect(getMaterialGroup(item("item_iron_cmpt"))).toBe("component");
    expect(getMaterialGroup(item("item_proc_battery_demo"))).toBe("battery");
    expect(getMaterialGroup(item("item_equip_script_demo"))).toBe("equipment");
    expect(getMaterialGroup(item("item_bottled_rec_hp_1"))).toBe("medicine");
    expect(getMaterialGroup(item("item_bottled_food_demo"))).toBe("food");
    expect(getMaterialGroup(item("item_proc_bomb_demo"))).toBe("bomb");
    expect(getMaterialGroup(item("item_activity_xiranite_nugget"))).toBe(
      "event",
    );
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
