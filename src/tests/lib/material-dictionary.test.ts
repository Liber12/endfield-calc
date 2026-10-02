import { describe, expect, test } from "vitest";

import {
  buildRecipeIndex,
  buildRequirementTree,
  buildUsageTree,
  getPrimaryProductionRecipes,
} from "@/lib/material-dictionary";
import type { FacilityId, ItemId, Recipe, RecipeId } from "@/types";
import { FacilityId as FacilityIds } from "@/types/constants";

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

describe("material dictionary recipe index", () => {
  test("indexes direct producers and consumers without recursion", () => {
    const makeB = recipe("make_b", ["a"], ["b"]);
    const makeC = recipe("make_c", ["b"], ["c"]);
    const index = buildRecipeIndex([makeB, makeC]);

    expect(index.usedBy.get("a" as ItemId)?.map((r) => r.id)).toEqual([
      "make_b",
    ]);
    expect(index.producedBy.get("b" as ItemId)?.map((r) => r.id)).toEqual([
      "make_b",
    ]);
    expect(index.usedBy.get("b" as ItemId)?.map((r) => r.id)).toEqual([
      "make_c",
    ]);
  });

  test("deduplicates a recipe if the same item appears twice in one side", () => {
    const duplicated = {
      ...recipe("dup", ["a"], ["b"]),
      inputs: [
        { itemId: "a" as ItemId, amount: 1 },
        { itemId: "a" as ItemId, amount: 2 },
      ],
    };
    const index = buildRecipeIndex([duplicated]);

    expect(index.usedBy.get("a" as ItemId)).toHaveLength(1);
  });
});

describe("material dictionary downstream tree", () => {
  test("marks a true cycle and terminates instead of recurring forever", () => {
    const index = buildRecipeIndex([
      recipe("a_to_b", ["a"], ["b"]),
      recipe("b_to_c", ["b"], ["c"]),
      recipe("c_to_a", ["c"], ["a"]),
    ]);

    const tree = buildUsageTree("a" as ItemId, index, {
      maxDepth: 20,
      maxNodes: 100,
    });

    const cycleNode = tree.children[0]?.children[0]?.children[0];
    expect(cycleNode?.itemId).toBe("a");
    expect(cycleNode?.cycle).toBe(true);
    expect(cycleNode?.children).toEqual([]);
  });

  test("uses a path-local cycle set so converging legitimate paths are preserved", () => {
    const index = buildRecipeIndex([
      recipe("a_to_b", ["a"], ["b"]),
      recipe("a_to_c", ["a"], ["c"]),
      recipe("b_to_d", ["b"], ["d"]),
      recipe("c_to_d", ["c"], ["d"]),
    ]);

    const tree = buildUsageTree("a" as ItemId, index);
    const dNodes = tree.children.flatMap((child) => child.children);

    expect(dNodes.filter((node) => node.itemId === ("d" as ItemId))).toHaveLength(2);
    expect(dNodes.every((node) => node.cycle === false)).toBe(true);
  });

  test("stops at the configured depth as a secondary safety valve", () => {
    const index = buildRecipeIndex([
      recipe("a_to_b", ["a"], ["b"]),
      recipe("b_to_c", ["b"], ["c"]),
      recipe("c_to_d", ["c"], ["d"]),
    ]);

    const tree = buildUsageTree("a" as ItemId, index, { maxDepth: 2 });
    const c = tree.children[0]?.children[0];

    expect(c?.itemId).toBe("c");
    expect(c?.depthLimited).toBe(true);
    expect(c?.children).toEqual([]);
  });
});


describe("material dictionary requirement tree", () => {
  test("expands producer inputs upstream and normalizes cumulative amounts", () => {
    const makeB = {
      ...recipe("make_b", ["a"], ["b"]),
      inputs: [{ itemId: "a" as ItemId, amount: 3 }],
      outputs: [{ itemId: "b" as ItemId, amount: 2 }],
    };
    const makeC = {
      ...recipe("make_c", ["b"], ["c"]),
      inputs: [{ itemId: "b" as ItemId, amount: 4 }],
      outputs: [{ itemId: "c" as ItemId, amount: 1 }],
    };
    const index = buildRecipeIndex([makeB, makeC]);

    const tree = buildRequirementTree("c" as ItemId, index);
    const b = tree.recipes[0]?.inputs[0];
    const a = b?.recipes[0]?.inputs[0];

    expect(tree.amount).toBe(1);
    expect(b?.itemId).toBe("b");
    expect(b?.amount).toBe(4);
    expect(a?.itemId).toBe("a");
    expect(a?.amount).toBe(6);
  });

  test("keeps alternative producer recipes instead of choosing one silently", () => {
    const index = buildRecipeIndex([
      recipe("a_to_c", ["a"], ["c"]),
      recipe("b_to_c", ["b"], ["c"]),
    ]);

    const tree = buildRequirementTree("c" as ItemId, index);

    expect(tree.recipes.map((branch) => branch.recipeId)).toEqual([
      "a_to_c",
      "b_to_c",
    ]);
    expect(tree.recipes[0]?.inputs[0]?.itemId).toBe("a");
    expect(tree.recipes[1]?.inputs[0]?.itemId).toBe("b");
  });

  test("excludes dismantler recovery branches from normal production", () => {
    const shapedBottle = {
      ...recipe("shape_bottle", ["copper"], ["bottle"]),
      facilityId: "shaper_1" as FacilityId,
    };
    const recoveredBottle = {
      ...recipe("recover_bottle", ["filled_bottle"], ["bottle"]),
      facilityId: FacilityIds.DISMANTLER_1,
    };
    const makeProduct = recipe("make_product", ["bottle"], ["product"]);
    const index = buildRecipeIndex([
      shapedBottle,
      recoveredBottle,
      makeProduct,
    ]);

    expect(
      getPrimaryProductionRecipes("bottle" as ItemId, index).map(
        (entry) => entry.id,
      ),
    ).toEqual(["shape_bottle"]);

    const tree = buildRequirementTree("product" as ItemId, index);
    const bottle = tree.recipes[0]?.inputs[0];

    expect(bottle?.itemId).toBe("bottle");
    expect(bottle?.recipes.map((branch) => branch.recipeId)).toEqual([
      "shape_bottle",
    ]);
  });

  test("marks upstream cycles and stops recursion", () => {
    const index = buildRecipeIndex([
      recipe("a_to_b", ["a"], ["b"]),
      recipe("b_to_a", ["b"], ["a"]),
    ]);

    const tree = buildRequirementTree("a" as ItemId, index, {
      maxDepth: 20,
      maxNodes: 100,
    });

    const cycleNode = tree.recipes[0]?.inputs[0]?.recipes[0]?.inputs[0];
    expect(cycleNode?.itemId).toBe("a");
    expect(cycleNode?.cycle).toBe(true);
    expect(cycleNode?.recipes).toEqual([]);
  });
});
