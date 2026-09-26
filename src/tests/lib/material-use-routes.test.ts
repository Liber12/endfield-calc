import { describe, expect, test } from "vitest";

import { items } from "@/data/items";
import { externalItemUses } from "@/data/material-external-uses";
import { buildRecipeIndex } from "@/lib/material-dictionary";
import {
  findShortestMaterialRoute,
  getMeaningfulDirectUses,
  getUsefulEndpoints,
  isMeaningfulUsageRecipe,
} from "@/lib/material-use-routes";
import type {
  FacilityId,
  Item,
  ItemId,
  Recipe,
  RecipeId,
} from "@/types";

const makeItem = (
  id: string,
  extra: Partial<Omit<Item, "id" | "tier">> = {},
): Item => ({
  id: id as ItemId,
  tier: 1,
  ...extra,
});

const makeRecipe = (
  id: string,
  inputs: string[],
  outputs: string[],
  facilityId = "facility",
): Recipe => ({
  id: id as RecipeId,
  inputs: inputs.map((itemId) => ({
    itemId: itemId as ItemId,
    amount: 1,
  })),
  outputs: outputs.map((itemId) => ({
    itemId: itemId as ItemId,
    amount: 1,
  })),
  facilityId: facilityId as FacilityId,
  craftingTime: 1,
});

describe("meaningful material uses", () => {
  test("omits dismantling and transport-only filled-container recipes", () => {
    const root = makeItem("item_originium_ore");
    const normal = makeItem("item_crystal_shell");
    const filled = makeItem("item_fbottle_glass_water", { asTarget: false });
    const itemById = new Map(
      [root, normal, filled].map((item) => [item.id, item] as const),
    );

    const normalRecipe = makeRecipe(
      "normal",
      ["item_originium_ore"],
      ["item_crystal_shell"],
    );
    const transportRecipe = makeRecipe(
      "transport",
      ["item_originium_ore"],
      ["item_fbottle_glass_water"],
    );
    const dismantleRecipe = makeRecipe(
      "dismantle",
      ["item_crystal_shell"],
      ["item_originium_ore"],
      "dismantler_1",
    );

    expect(isMeaningfulUsageRecipe(normalRecipe, itemById)).toBe(true);
    expect(isMeaningfulUsageRecipe(transportRecipe, itemById)).toBe(false);
    expect(isMeaningfulUsageRecipe(dismantleRecipe, itemById)).toBe(false);

    const index = buildRecipeIndex([
      normalRecipe,
      transportRecipe,
      dismantleRecipe,
    ]);
    expect(
      getMeaningfulDirectUses(root.id, index, itemById).map(
        (recipe) => recipe.id,
      ),
    ).toEqual(["normal"]);
  });

  test("finds one shortest route and retains co-inputs as side information", () => {
    const root = makeItem("item_originium_ore");
    const coInput = makeItem("item_carbon_mtl");
    const target = makeItem("item_crystal_shell");
    const itemById = new Map(
      [root, coInput, target].map((item) => [item.id, item] as const),
    );

    const direct: Recipe = {
      ...makeRecipe(
        "direct",
        ["item_originium_ore", "item_carbon_mtl"],
        ["item_crystal_shell"],
      ),
      inputs: [
        { itemId: root.id, amount: 1 },
        { itemId: coInput.id, amount: 2 },
      ],
    };

    const index = buildRecipeIndex([direct]);
    const route = findShortestMaterialRoute(
      root.id,
      target.id,
      index,
      itemById,
    );

    expect(route).toHaveLength(1);
    expect(route?.[0]?.toItemId).toBe(target.id);
    expect(route?.[0]?.coInputs).toEqual([
      { itemId: coInput.id, amount: 2 },
    ]);
  });

  test("only exposes terminal event products, not event intermediates", () => {
    const root = makeItem("item_originium_ore");
    const intermediate = makeItem("item_activity_xiranite_cmpt");
    const final = makeItem("item_activity_xiranite_hulu");
    const itemById = new Map(
      [root, intermediate, final].map((item) => [item.id, item] as const),
    );

    const index = buildRecipeIndex([
      makeRecipe(
        "event_mid",
        ["item_originium_ore"],
        ["item_activity_xiranite_cmpt"],
      ),
      makeRecipe(
        "event_final",
        ["item_activity_xiranite_cmpt"],
        ["item_activity_xiranite_hulu"],
      ),
    ]);

    const endpoints = getUsefulEndpoints(root.id, index, itemById);

    expect(
      endpoints.some(
        (endpoint) => endpoint.targetItemId === intermediate.id,
      ),
    ).toBe(false);
    expect(
      endpoints.some(
        (endpoint) =>
          endpoint.kind === "product" &&
          endpoint.targetItemId === final.id,
      ),
    ).toBe(true);
  });

  test("exposes reachable Wikiru-backed trade and facility destinations", () => {
    const root = makeItem("item_originium_ore");
    const target = makeItem("item_crystal_shell");
    const itemById = new Map(
      [root, target].map((item) => [item.id, item] as const),
    );

    const index = buildRecipeIndex([
      makeRecipe(
        "refine",
        ["item_originium_ore"],
        ["item_crystal_shell"],
      ),
    ]);

    const endpoints = getUsefulEndpoints(root.id, index, itemById);

    expect(
      endpoints.some(
        (endpoint) =>
          endpoint.kind === "facility" &&
          endpoint.targetItemId === target.id &&
          (endpoint.facilityUses?.length ?? 0) > 0,
      ),
    ).toBe(true);
    expect(
      endpoints.some(
        (endpoint) =>
          endpoint.kind === "trade" &&
          endpoint.targetItemId === target.id &&
          (endpoint.tradeUses?.length ?? 0) > 0,
      ),
    ).toBe(true);
  });
});

describe("external material-use data", () => {
  test("references only item IDs present in the calculator roster", () => {
    const roster = new Set(items.map((item) => item.id));
    const missing = externalItemUses
      .map((entry) => entry.itemId)
      .filter((itemId) => !roster.has(itemId));

    expect(missing).toEqual([]);
  });
});
