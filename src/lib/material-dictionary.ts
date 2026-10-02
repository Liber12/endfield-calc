import type { Item, ItemId, Recipe, RecipeId } from "@/types";
import { FacilityId } from "@/types/constants";
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

export type RequirementTreeRecipe = {
  recipeId: RecipeId;
  outputAmount: number;
  inputs: RequirementTreeNode[];
};

export type RequirementTreeNode = {
  itemId: ItemId;
  /** Cumulative amount required per one unit of the root item. */
  amount: number;
  cycle: boolean;
  depthLimited: boolean;
  nodeLimited: boolean;
  recipes: RequirementTreeRecipe[];
};

export type RequirementTreeOptions = UsageTreeOptions;


/**
 * Recovery/disassembly recipes are valid game operations, but they should not
 * be treated as normal upstream manufacturing choices in the dictionary.
 *
 * In particular, every empty bottle can be recovered by dismantling many
 * different filled bottles. Treating those recovery outputs as alternative
 * "production recipes" makes an upstream dependency tree explode without
 * helping answer "what do I need to manufacture this item?".
 */
export function isRecoveryRecipe(recipe: Recipe): boolean {
  return recipe.facilityId === FacilityId.DISMANTLER_1;
}

export function getPrimaryProductionRecipes(
  itemId: ItemId,
  index: RecipeIndex,
): readonly Recipe[] {
  return (index.producedBy.get(itemId) ?? []).filter(
    (recipe) => !isRecoveryRecipe(recipe),
  );
}

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


/**
 * Builds an upstream requirement tree for one unit of the selected item.
 *
 * Every recipe that can produce an item is retained as an alternative branch;
 * the dictionary must not silently choose an arbitrary recipe. Child amounts
 * are normalized to the amount of the parent item currently required, so the
 * displayed quantities stay meaningful all the way down to raw leaves.
 *
 * Path-local cycle detection preserves legitimate converging branches while
 * preventing recursive recipes from looping forever. Depth and node budgets
 * are secondary guards for future, broader recipe datasets.
 */
export function buildRequirementTree(
  rootItemId: ItemId,
  index: RecipeIndex,
  options: RequirementTreeOptions = {},
): RequirementTreeNode {
  const maxDepth = options.maxDepth ?? 8;
  const maxNodes = options.maxNodes ?? 400;
  let nodeCount = 0;

  const walk = (
    itemId: ItemId,
    amount: number,
    path: ReadonlySet<ItemId>,
    depth: number,
  ): RequirementTreeNode => {
    const cycle = path.has(itemId);
    nodeCount += 1;

    if (cycle) {
      return {
        itemId,
        amount,
        cycle: true,
        depthLimited: false,
        nodeLimited: false,
        recipes: [],
      };
    }

    if (depth >= maxDepth) {
      return {
        itemId,
        amount,
        cycle: false,
        depthLimited: true,
        nodeLimited: false,
        recipes: [],
      };
    }

    if (nodeCount >= maxNodes) {
      return {
        itemId,
        amount,
        cycle: false,
        depthLimited: false,
        nodeLimited: true,
        recipes: [],
      };
    }

    const nextPath = new Set(path);
    nextPath.add(itemId);
    const branches: RequirementTreeRecipe[] = [];

    for (const recipe of getPrimaryProductionRecipes(itemId, index)) {
      if (nodeCount >= maxNodes) break;

      const outputAmount = recipe.outputs
        .filter((output) => output.itemId === itemId)
        .reduce((sum, output) => sum + output.amount, 0);

      if (outputAmount <= 0) continue;

      const inputAmounts = new Map<ItemId, number>();
      for (const input of recipe.inputs) {
        inputAmounts.set(
          input.itemId,
          (inputAmounts.get(input.itemId) ?? 0) + input.amount,
        );
      }

      const inputs: RequirementTreeNode[] = [];
      for (const [inputItemId, inputAmount] of inputAmounts) {
        if (nodeCount >= maxNodes) {
          inputs.push({
            itemId: inputItemId,
            amount: (amount * inputAmount) / outputAmount,
            cycle: false,
            depthLimited: false,
            nodeLimited: true,
            recipes: [],
          });
          break;
        }

        inputs.push(
          walk(
            inputItemId,
            (amount * inputAmount) / outputAmount,
            nextPath,
            depth + 1,
          ),
        );
      }

      branches.push({
        recipeId: recipe.id,
        outputAmount,
        inputs,
      });
    }

    return {
      itemId,
      amount,
      cycle: false,
      depthLimited: false,
      nodeLimited: false,
      recipes: branches,
    };
  };

  return walk(rootItemId, 1, new Set<ItemId>(), 0);
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
