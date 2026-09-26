import { describe, expect, test } from "vitest";

import {
  buildRecipeIndex,
  buildUsageTree,
} from "@/lib/material-dictionary";
import type { FacilityId, ItemId, Recipe, RecipeId } from "@/types";

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

    expect(dNodes.filter((node) => node.itemId === "d")).toHaveLength(2);
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
