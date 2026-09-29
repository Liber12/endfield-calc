import type { SiteSolveResult } from "@/core/calculation";

export function environmentSummary(result: SiteSolveResult) {
  const context = result.context;
  return {
    currentDomain: context.currentDomain,
    activeDomains: [...context.activeDomains],
    researchedTechCount: context.researched.size,
    availableRecipeCount: context.availableRecipes.length,
    reachableItemCount: context.reachableItems.size,
    regionRawMaterials: [...context.regionRawMaterials],
    facilityCaps: context.facilityCaps,
    rawMaterialCaps: context.rawMaterialCaps,
    metastorageRoutes: context.metastorageRoutes.map((route) => ({
      sourceDomain: route.sourceDomain,
      ttvBudgetPerMinute: route.ttvBudgetPerMinute,
      cycleSeconds: route.cycleSeconds,
      eligibleItems: [...route.itemCosts.keys()],
    })),
    prunedTargets: result.prunedTargets,
    prunedRecipeOverrides: context.prunedRecipeOverrides,
    prunedManualRawMaterials: context.prunedManualRawMaterials,
  };
}

export function cliJsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}
