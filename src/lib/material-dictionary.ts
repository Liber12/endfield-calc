import type { Item, ItemId, Recipe, RecipeId } from "@/types";
import { isPackagingItem } from "@/lib/item-category";

export type RecipeIndex = {
  producedBy: ReadonlyMap<ItemId, readonly Recipe[]>;
  usedBy: ReadonlyMap<ItemId, readonly Recipe[]>;
};

export type UsageTreeNode = {
  itemId: ItemId;
  viaRecipeId?: RecipeId;
  cycle: boolean;
  depthLimited: boolean;
  nodeLimited: boolean;
  children: UsageTreeNode[];
};

export type UsageTreeOptions = {
  maxDepth?: number;
  maxNodes?: number;
};

function pushUniqueRecipe(
  map: Map<ItemId, Recipe[]>,
  itemId: ItemId,
  recipe: Recipe,
) {
  const current = map.get(itemId);
  if (!current) {
    map.set(itemId, [recipe]);
    return;
  }
  if (!current.some((entry) => entry.id === recipe.id)) current.push(recipe);
}

/**
 * Build both directions of the recipe relationship graph once.
 *
 * `usedBy` is intentionally direct-only: looking up an item's uses never
 * performs recursive traversal, so cycles in the production graph cannot
 * hang the material dictionary.
 */
export function buildRecipeIndex(recipes: readonly Recipe[]): RecipeIndex {
  const producedBy = new Map<ItemId, Recipe[]>();
  const usedBy = new Map<ItemId, Recipe[]>();

  for (const recipe of recipes) {
    for (const input of recipe.inputs) {
      pushUniqueRecipe(usedBy, input.itemId, recipe);
    }
    for (const output of recipe.outputs) {
      pushUniqueRecipe(producedBy, output.itemId, recipe);
    }
  }

  return { producedBy, usedBy };
}

/**
 * Builds a downstream usage tree while treating the current traversal path,
 * rather than a global visited set, as the cycle boundary. This preserves
 * legitimate converging paths (A→C and B→C) while stopping only true cycles.
 *
 * A depth cap and a global node budget are secondary safety valves for very
 * broad future recipe rosters. Direct usage lookup does not depend on this
 * function.
 */
export function buildUsageTree(
  rootItemId: ItemId,
  index: RecipeIndex,
  options: UsageTreeOptions = {},
): UsageTreeNode {
  const maxDepth = options.maxDepth ?? 8;
  const maxNodes = options.maxNodes ?? 600;
  let nodeCount = 0;

  const walk = (
    itemId: ItemId,
    viaRecipeId: RecipeId | undefined,
    path: ReadonlySet<ItemId>,
    depth: number,
  ): UsageTreeNode => {
    const cycle = path.has(itemId);
    nodeCount += 1;

    if (cycle) {
      return {
        itemId,
        viaRecipeId,
        cycle: true,
        depthLimited: false,
        nodeLimited: false,
        children: [],
      };
    }

    if (depth >= maxDepth) {
      return {
        itemId,
        viaRecipeId,
        cycle: false,
        depthLimited: true,
        nodeLimited: false,
        children: [],
      };
    }

    if (nodeCount >= maxNodes) {
      return {
        itemId,
        viaRecipeId,
        cycle: false,
        depthLimited: false,
        nodeLimited: true,
        children: [],
      };
    }

    const nextPath = new Set(path);
    nextPath.add(itemId);
    const children: UsageTreeNode[] = [];

    for (const recipe of index.usedBy.get(itemId) ?? []) {
      for (const output of recipe.outputs) {
        if (nodeCount >= maxNodes) {
          children.push({
            itemId: output.itemId,
            viaRecipeId: recipe.id,
            cycle: false,
            depthLimited: false,
            nodeLimited: true,
            children: [],
          });
          break;
        }
        children.push(walk(output.itemId, recipe.id, nextPath, depth + 1));
      }
      if (nodeCount >= maxNodes) break;
    }

    return {
      itemId,
      viaRecipeId,
      cycle: false,
      depthLimited: false,
      nodeLimited: false,
      children,
    };
  };

  return walk(rootItemId, undefined, new Set<ItemId>(), 0);
}


export function isTerminalPackagingItem(
  itemId: ItemId,
  itemById: ReadonlyMap<ItemId, Item>,
  index: RecipeIndex,
): boolean {
  const item = itemById.get(itemId);
  if (!item || !isPackagingItem(item)) return false;
  return (index.usedBy.get(itemId)?.length ?? 0) === 0;
}

export function recipeEndsOnlyInTerminalPackaging(
  recipe: Recipe,
  itemById: ReadonlyMap<ItemId, Item>,
  index: RecipeIndex,
): boolean {
  return (
    recipe.outputs.length > 0 &&
    recipe.outputs.every((output) =>
      isTerminalPackagingItem(output.itemId, itemById, index),
    )
  );
}
