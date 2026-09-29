import { powerFuels } from "@/data";
import { DEFAULT_MACHINES_PER_VAPORIZER } from "@/lib/sustain-constants";
import type { CalculateProductionPlanOptions } from "@/lib/calculator";
import type {
  Facility,
  FacilityId,
  Item,
  ItemId,
  Recipe,
  RecipeId,
} from "@/types";
import type { MetastorageRouteConfig } from "@/types/metastorage";

export interface CalculationProblem {
  items: readonly Item[];
  recipes: readonly Recipe[];
  facilities: readonly Facility[];
  options: CalculateProductionPlanOptions;
}

export interface BuildCalculationProblemInput {
  items: readonly Item[];
  recipes: readonly Recipe[];
  facilities: readonly Facility[];
  rawMaterials: ReadonlySet<ItemId>;
  rawCaps?: ReadonlyMap<ItemId, number>;
  recipeOverrides?: ReadonlyMap<ItemId, RecipeId>;
  manualRawMaterials?: ReadonlySet<ItemId>;
  facilityCaps?: ReadonlyMap<FacilityId, number>;
  metastorageRoutes?: readonly MetastorageRouteConfig[];
  powerSustain?: boolean;
  machinesPerVaporizer?: number;
}

/**
 * Canonical solver problem builder shared by all interfaces.
 *
 * GUI and CLI must both pass their resolved environment into this function
 * instead of constructing CalculateProductionPlanOptions independently.
 */
export function buildCalculationProblem(
  input: BuildCalculationProblemInput,
): CalculationProblem {
  const machinesPerVaporizer =
    input.machinesPerVaporizer ?? DEFAULT_MACHINES_PER_VAPORIZER;

  return {
    items: input.items,
    recipes: input.recipes,
    facilities: input.facilities,
    options: {
      rawMaterials: input.rawMaterials,
      rawCaps: input.rawCaps,
      recipeOverrides: input.recipeOverrides,
      manualRawMaterials: input.manualRawMaterials,
      facilityCaps: input.facilityCaps,
      metastorageRoutes: input.metastorageRoutes,
      powerSustain: input.powerSustain ? { fuels: powerFuels } : undefined,
      gasSustain:
        machinesPerVaporizer !== DEFAULT_MACHINES_PER_VAPORIZER
          ? { machinesPerVaporizer }
          : undefined,
    },
  };
}
