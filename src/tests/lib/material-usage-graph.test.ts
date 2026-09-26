import { describe, expect, test } from "vitest";

import { buildRecipeIndex } from "@/lib/material-dictionary";
import { buildMaterialUsageGraph } from "@/lib/material-usage-graph";
import type {
  FacilityId,
  Item,
  ItemId,
  Recipe,
  RecipeId,
} from "@/types";

const item = (id: string): Item => ({
  id: id as ItemId,
  tier: 1,
});

const recipe = (
  id: string,
  inputs: string[],
  outputs: string[],
): Recipe => ({
  id: id as RecipeId,
  inputs: inputs.map((itemId) => ({ itemId: itemId as ItemId, amount: 1 })),
  outputs: outputs.map((itemId) => ({ itemId: itemId as ItemId, amount: 1 })),
  facilityId: "facility" as FacilityId,
  craftingTime: 1,
});

describe("material usage graph", () => {
  test("hides only terminal packaging branches by default", () => {
    const recipes = [
      recipe("to_bottle", ["item_iron_powder"], ["item_iron_bottle"]),
      recipe("to_component", ["item_iron_powder"], ["item_iron_cmpt"]),
      recipe("component_use", ["item_iron_cmpt"], ["item_filter_core"]),
    ];
    const items = [
      item("item_iron_powder"),
      item("item_iron_bottle"),
      item("item_iron_cmpt"),
      item("item_filter_core"),
    ];
    const itemById = new Map(items.map((entry) => [entry.id, entry] as const));
    const index = buildRecipeIndex(recipes);

    const hidden = buildMaterialUsageGraph(
      "item_iron_powder" as ItemId,
      index,
      itemById,
      { hideTerminalPackaging: true },
    );

    expect(hidden.recipeIds.has("to_bottle" as RecipeId)).toBe(false);
    expect(
      hidden.hiddenTerminalRecipeIds.has("to_bottle" as RecipeId),
    ).toBe(true);
    expect(hidden.recipeIds.has("to_component" as RecipeId)).toBe(true);

    const shown = buildMaterialUsageGraph(
      "item_iron_powder" as ItemId,
      index,
      itemById,
      { hideTerminalPackaging: false },
    );

    expect(shown.recipeIds.has("to_bottle" as RecipeId)).toBe(true);
    expect(shown.itemIds.has("item_iron_bottle" as ItemId)).toBe(true);
  });

  test("deduplicates converging item nodes and marks cycle edges", () => {
    const recipes = [
      recipe("a_to_b", ["item_iron_powder"], ["item_iron_cmpt"]),
      recipe("a_to_c", ["item_iron_powder"], ["item_copper_cmpt"]),
      recipe("b_to_d", ["item_iron_cmpt"], ["item_filter_core"]),
      recipe("c_to_d", ["item_copper_cmpt"], ["item_filter_core"]),
      recipe("d_to_a", ["item_filter_core"], ["item_iron_powder"]),
    ];
    const items = [
      item("item_iron_powder"),
      item("item_iron_cmpt"),
      item("item_copper_cmpt"),
      item("item_filter_core"),
    ];
    const itemById = new Map(items.map((entry) => [entry.id, entry] as const));
    const index = buildRecipeIndex(recipes);

    const graph = buildMaterialUsageGraph(
      "item_iron_powder" as ItemId,
      index,
      itemById,
      { hideTerminalPackaging: true, maxDepth: 10 },
    );

    expect(
      [...graph.itemIds].filter((id) => id === ("item_filter_core" as ItemId)),
    ).toHaveLength(1);
    expect(graph.edges.some((edge) => edge.cycle)).toBe(true);
  });
});
