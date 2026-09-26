import type { Item, ItemId, RecipeId } from "@/types";
import type { RecipeIndex } from "@/lib/material-dictionary";
import { isTerminalPackagingItem } from "@/lib/material-dictionary";

export type MaterialUsageGraphEdge = {
  id: string;
  source: string;
  target: string;
  cycle: boolean;
};

export type MaterialUsageGraphData = {
  itemIds: Set<ItemId>;
  recipeIds: Set<RecipeId>;
  edges: MaterialUsageGraphEdge[];
  hiddenTerminalRecipeIds: Set<RecipeId>;
  truncated: boolean;
};

export type MaterialUsageGraphOptions = {
  hideTerminalPackaging?: boolean;
  maxDepth?: number;
  maxNodes?: number;
};

export function buildMaterialUsageGraph(
  rootItemId: ItemId,
  index: RecipeIndex,
  itemById: ReadonlyMap<ItemId, Item>,
  options: MaterialUsageGraphOptions = {},
): MaterialUsageGraphData {
  const hideTerminalPackaging = options.hideTerminalPackaging ?? true;
  const maxDepth = options.maxDepth ?? 6;
  const maxNodes = options.maxNodes ?? 180;

  const itemIds = new Set<ItemId>([rootItemId]);
  const recipeIds = new Set<RecipeId>();
  const hiddenTerminalRecipeIds = new Set<RecipeId>();
  const edges: MaterialUsageGraphEdge[] = [];
  const edgeIds = new Set<string>();
  const expandedItems = new Set<ItemId>();

  let truncated = false;

  const pushEdge = (
    source: string,
    target: string,
    cycle: boolean,
  ) => {
    const id = `${source}->${target}`;
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({ id, source, target, cycle });
  };

  const queue: Array<{
    itemId: ItemId;
    depth: number;
    path: Set<ItemId>;
  }> = [
    {
      itemId: rootItemId,
      depth: 0,
      path: new Set([rootItemId]),
    },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (expandedItems.has(current.itemId)) continue;
    expandedItems.add(current.itemId);

    if (current.depth >= maxDepth) {
      truncated = true;
      continue;
    }

    for (const recipe of index.usedBy.get(current.itemId) ?? []) {
      const visibleOutputs = recipe.outputs.filter(
        (output) =>
          !(
            hideTerminalPackaging &&
            isTerminalPackagingItem(output.itemId, itemById, index)
          ),
      );

      if (
        hideTerminalPackaging &&
        recipe.outputs.length > 0 &&
        visibleOutputs.length === 0
      ) {
        hiddenTerminalRecipeIds.add(recipe.id);
        continue;
      }

      const recipeNodeId = `recipe:${recipe.id}`;
      const sourceItemNodeId = `item:${current.itemId}`;

      if (!recipeIds.has(recipe.id)) {
        if (itemIds.size + recipeIds.size >= maxNodes) {
          truncated = true;
          continue;
        }
        recipeIds.add(recipe.id);
      }

      pushEdge(sourceItemNodeId, recipeNodeId, false);

      for (const output of visibleOutputs) {
        const outputNodeId = `item:${output.itemId}`;
        const isCycle = current.path.has(output.itemId);

        if (!itemIds.has(output.itemId)) {
          if (itemIds.size + recipeIds.size >= maxNodes) {
            truncated = true;
            continue;
          }
          itemIds.add(output.itemId);
        }

        pushEdge(recipeNodeId, outputNodeId, isCycle);

        if (!isCycle && !expandedItems.has(output.itemId)) {
          const nextPath = new Set(current.path);
          nextPath.add(output.itemId);
          queue.push({
            itemId: output.itemId,
            depth: current.depth + 1,
            path: nextPath,
          });
        }
      }
    }
  }

  return {
    itemIds,
    recipeIds,
    edges,
    hiddenTerminalRecipeIds,
    truncated,
  };
}
