import type { Item, ItemId, Recipe } from "@/types";
import {
  externalItemUseById,
  type FacilityUse,
  type TradeUse,
} from "@/data/material-external-uses";
import { getMaterialSubtype } from "@/lib/item-category";
import type { RecipeIndex } from "@/lib/material-dictionary";

export type UsefulEndpointKind = "product" | "trade" | "facility";

export type UsefulEndpoint = {
  id: string;
  kind: UsefulEndpointKind;
  targetItemId: ItemId;
  tradeUses?: readonly TradeUse[];
  facilityUses?: readonly FacilityUse[];
};

export type MaterialRouteStep = {
  fromItemId: ItemId;
  toItemId: ItemId;
  recipe: Recipe;
  coInputs: Recipe["inputs"];
};

export type ItemUseSummary = {
  directRecipeCount: number;
  facilityUseCount: number;
  tradeBaseCount: number;
  roleCount: number;
  stockCandidate: boolean;
};

const USEFUL_PRODUCT_SUBTYPES = new Set([
  "medicine",
  "food",
  "bomb",
  "battery",
  "equipment",
  "event",
]);

/**
 * Recipes that describe meaningful transformation for a material dictionary.
 *
 * Filled transport containers are intentionally omitted from route discovery:
 * they exist to move fluids/gases through logistics and create enormous
 * fill/dismantle cycles, but they are not useful "what can I ultimately make?"
 * endpoints.
 */
export function isMeaningfulUsageRecipe(
  recipe: Recipe,
  itemById: ReadonlyMap<ItemId, Item>,
): boolean {
  if (String(recipe.facilityId) === "dismantler_1") return false;
  if (recipe.outputs.length === 0) return false;

  const outputs = recipe.outputs
    .map((entry) => itemById.get(entry.itemId))
    .filter((item): item is Item => item !== undefined);

  if (outputs.length === 0) return false;
  if (outputs.every((item) => item.asTarget === false)) return false;

  return true;
}

export function getMeaningfulDirectUses(
  itemId: ItemId,
  index: RecipeIndex,
  itemById: ReadonlyMap<ItemId, Item>,
): readonly Recipe[] {
  return (index.usedBy.get(itemId) ?? []).filter((recipe) =>
    isMeaningfulUsageRecipe(recipe, itemById),
  );
}

export function getReachableItems(
  rootItemId: ItemId,
  index: RecipeIndex,
  itemById: ReadonlyMap<ItemId, Item>,
): Set<ItemId> {
  const visited = new Set<ItemId>([rootItemId]);
  const queue: ItemId[] = [rootItemId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const recipe of getMeaningfulDirectUses(current, index, itemById)) {
      for (const output of recipe.outputs) {
        const item = itemById.get(output.itemId);
        if (!item || item.asTarget === false || visited.has(output.itemId)) {
          continue;
        }
        visited.add(output.itemId);
        queue.push(output.itemId);
      }
    }
  }

  return visited;
}

export function getUsefulEndpoints(
  rootItemId: ItemId,
  index: RecipeIndex,
  itemById: ReadonlyMap<ItemId, Item>,
): UsefulEndpoint[] {
  const reachable = getReachableItems(rootItemId, index, itemById);
  const endpoints: UsefulEndpoint[] = [];

  for (const itemId of reachable) {
    const item = itemById.get(itemId);
    if (!item) continue;

    if (
      itemId !== rootItemId &&
      item.asTarget !== false &&
      USEFUL_PRODUCT_SUBTYPES.has(getMaterialSubtype(item))
    ) {
      endpoints.push({
        id: `product:${itemId}`,
        kind: "product",
        targetItemId: itemId,
      });
    }

    const external = externalItemUseById.get(itemId);
    if (external?.tradeUses?.length) {
      endpoints.push({
        id: `trade:${itemId}`,
        kind: "trade",
        targetItemId: itemId,
        tradeUses: external.tradeUses,
      });
    }

    if (external?.facilityUses?.length) {
      endpoints.push({
        id: `facility:${itemId}`,
        kind: "facility",
        targetItemId: itemId,
        facilityUses: external.facilityUses,
      });
    }
  }

  const kindOrder: Record<UsefulEndpointKind, number> = {
    product: 0,
    trade: 1,
    facility: 2,
  };

  endpoints.sort((a, b) => {
    const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return String(a.targetItemId).localeCompare(String(b.targetItemId));
  });

  return endpoints;
}

/**
 * Return one shortest material-to-material route.
 *
 * A global visited set is correct here because this is BFS path finding, not
 * tree rendering: once an item is reached at the shortest depth, revisiting it
 * cannot produce a shorter path.
 */
export function findShortestMaterialRoute(
  rootItemId: ItemId,
  targetItemId: ItemId,
  index: RecipeIndex,
  itemById: ReadonlyMap<ItemId, Item>,
): MaterialRouteStep[] | null {
  if (rootItemId === targetItemId) return [];

  type Previous = {
    fromItemId: ItemId;
    recipe: Recipe;
  };

  const previous = new Map<ItemId, Previous>();
  const visited = new Set<ItemId>([rootItemId]);
  const queue: ItemId[] = [rootItemId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const recipe of getMeaningfulDirectUses(current, index, itemById)) {
      for (const output of recipe.outputs) {
        const next = output.itemId;
        const nextItem = itemById.get(next);

        if (!nextItem || nextItem.asTarget === false || visited.has(next)) {
          continue;
        }

        visited.add(next);
        previous.set(next, { fromItemId: current, recipe });

        if (next === targetItemId) {
          const reversed: MaterialRouteStep[] = [];
          let cursor = targetItemId;

          while (cursor !== rootItemId) {
            const prev = previous.get(cursor);
            if (!prev) return null;

            reversed.push({
              fromItemId: prev.fromItemId,
              toItemId: cursor,
              recipe: prev.recipe,
              coInputs: prev.recipe.inputs.filter(
                (entry) => entry.itemId !== prev.fromItemId,
              ),
            });
            cursor = prev.fromItemId;
          }

          return reversed.reverse();
        }

        queue.push(next);
      }
    }
  }

  return null;
}

export function getItemUseSummary(
  itemId: ItemId,
  index: RecipeIndex,
  itemById: ReadonlyMap<ItemId, Item>,
): ItemUseSummary {
  const directRecipeCount = getMeaningfulDirectUses(
    itemId,
    index,
    itemById,
  ).length;
  const external = externalItemUseById.get(itemId);
  const facilityUseCount = external?.facilityUses?.length ?? 0;
  const tradeBaseCount = new Set(
    (external?.tradeUses ?? []).map((use) => use.base),
  ).size;

  const roleCount =
    Number(directRecipeCount > 0) +
    Number(facilityUseCount > 0) +
    Number(tradeBaseCount > 0);

  return {
    directRecipeCount,
    facilityUseCount,
    tradeBaseCount,
    roleCount,
    stockCandidate:
      roleCount >= 2 ||
      directRecipeCount >= 4 ||
      facilityUseCount >= 2 ||
      tradeBaseCount >= 2,
  };
}
