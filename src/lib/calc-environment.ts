import {
  bootstrapFacilities,
  defaultRawCapsByDomain,
  facilities,
  items,
  metastorageExports,
  metastorageSources,
  powerFuels,
  rawAvailabilityByDomain,
  recipes,
  regionStructures,
} from "@/data";
import {
  aicGroups,
  aicNodes,
  domains,
  facilityBaseCaps,
} from "@/data/aic-plans";
import {
  computeAvailableFacilities,
  computeEffectiveCaps,
  computeRecipeAvailability,
  computeUnlockedFacilities,
  computeUnlockedModes,
  capKey,
} from "@/lib/aic-research-helpers";
import { calculateProductionPlan } from "@/lib/calculator";
import { computeRecipeReachability } from "@/lib/recipe-reachability";
import { buildRawMaterialCaps, rawLimitKey } from "@/lib/raw-limits-helpers";
import { structureKey } from "@/lib/settings-helpers";
import { computeVariantExclusions } from "@/lib/variant-filter";
import { DEFAULT_MACHINES_PER_VAPORIZER } from "@/lib/sustain-constants";
import type { CalculateProductionPlanOptions } from "@/lib/calculator";
import type {
  FacilityId,
  ItemId,
  ProductionDependencyGraph,
  Recipe,
  RecipeId,
} from "@/types";
import type { AicTechId } from "@/types/aic";
import type { DomainId } from "@/types/domain";
import type {
  MetastorageRouteConfig,
  MetastorageRouteMode,
} from "@/types/metastorage";
import type { RegionStructureId } from "@/types/constants";

export interface SiteTargetInput {
  itemId: ItemId;
  rate: number;
  locked?: boolean;
}

export interface SiteCapOverrideInput {
  facilityId: FacilityId;
  domainId: DomainId;
  value: number;
}

export interface SiteRawLimitOverrideInput {
  itemId: ItemId;
  domainId: DomainId;
  value: number;
}

export interface SiteDisabledStructureInput {
  domainId: DomainId;
  structureId: RegionStructureId;
}

export interface SiteMetastorageRouteInput {
  source: DomainId;
  mode: MetastorageRouteMode;
}

export interface SiteRecipeOverrideInput {
  itemId: ItemId;
  recipeId: RecipeId;
}

/**
 * Solver-relevant settings mirrored from the web app.
 *
 * inactiveDomains, unresearched, structure disabled, and Metastorage route
 * deviations use the same absence/deviation semantics as the site's persisted
 * settings. Omitting a field means "use the site's default".
 */
export interface SiteCalculationSettingsInput {
  currentDomain?: DomainId;
  inactiveDomains?: readonly DomainId[];
  unresearched?: readonly AicTechId[];
  capOverrides?: readonly SiteCapOverrideInput[];
  rawLimitOverrides?: readonly SiteRawLimitOverrideInput[];
  disabledStructures?: readonly SiteDisabledStructureInput[];
  metastorageRoutes?: readonly SiteMetastorageRouteInput[];
  recipeOverrides?: readonly SiteRecipeOverrideInput[];
  manualRawMaterials?: readonly ItemId[];
  powerSustain?: boolean;
  machinesPerVaporizer?: number;
}

export interface SiteCalculationContext {
  readonly currentDomain: DomainId;
  readonly activeDomains: ReadonlySet<DomainId>;
  readonly researched: ReadonlySet<AicTechId>;
  readonly enabledStructures: ReadonlySet<string>;
  readonly availableRecipes: readonly Recipe[];
  readonly reachableItems: ReadonlySet<ItemId>;
  readonly metastorageOnlyItemIds: ReadonlySet<ItemId>;
  readonly regionRawMaterials: ReadonlySet<ItemId>;
  readonly facilityCaps: ReadonlyMap<FacilityId, number>;
  readonly rawMaterialCaps: ReadonlyMap<ItemId, number>;
  readonly metastorageRoutes: readonly MetastorageRouteConfig[];
  readonly options: CalculateProductionPlanOptions;
  readonly prunedRecipeOverrides: readonly SiteRecipeOverrideInput[];
  readonly prunedManualRawMaterials: readonly ItemId[];
}

export interface SiteSolveResult {
  readonly context: SiteCalculationContext;
  readonly targets: readonly SiteTargetInput[];
  readonly prunedTargets: readonly SiteTargetInput[];
  readonly plan: ProductionDependencyGraph;
}

function defaultCurrentDomain(): DomainId {
  const pinned = domains.find((d) => d.isPinned);
  const first = pinned ?? domains[0];
  if (!first) throw new Error("No domains are defined");
  return first.id;
}

function resolveActiveDomains(
  currentDomain: DomainId,
  inactiveDomains: readonly DomainId[] | undefined,
): Set<DomainId> {
  const defaultInactive = domains
    .filter((d) => !d.isPinned && d.id !== currentDomain)
    .map((d) => d.id);
  const inactive = new Set(inactiveDomains ?? defaultInactive);
  const active = new Set<DomainId>();
  for (const domain of domains) {
    if (!inactive.has(domain.id) || domain.isPinned || domain.id === currentDomain) {
      active.add(domain.id);
    }
  }
  for (const domain of domains) {
    if (domain.isPinned) active.add(domain.id);
  }
  active.add(currentDomain);
  return active;
}

function initialResearched(activeDomains: ReadonlySet<DomainId>): Set<AicTechId> {
  const groupDomain = new Map(aicGroups.map((g) => [g.id, g.domainId] as const));
  const out = new Set<AicTechId>();
  for (const node of aicNodes) {
    const domainId = groupDomain.get(node.groupId);
    if ((domainId && activeDomains.has(domainId)) || node.alreadyUnlocked) {
      out.add(node.id);
    }
  }
  return out;
}

function resolveResearched(
  activeDomains: ReadonlySet<DomainId>,
  unresearched: readonly AicTechId[] | undefined,
): Set<AicTechId> {
  if (unresearched === undefined) return initialResearched(activeDomains);
  const denied = new Set(unresearched);
  return new Set(aicNodes.filter((n) => !denied.has(n.id)).map((n) => n.id));
}

function resolveStructures(
  activeDomains: ReadonlySet<DomainId>,
  disabled: readonly SiteDisabledStructureInput[] | undefined,
): Set<string> {
  const denied = new Set(
    (disabled ?? []).map((x) => structureKey(x.domainId, x.structureId)),
  );
  const enabled = new Set<string>();
  for (const [domainId, list] of regionStructures) {
    if (!activeDomains.has(domainId)) continue;
    for (const structure of list) {
      const key = structureKey(domainId, structure.id);
      if (!denied.has(key)) enabled.add(key);
    }
  }
  return enabled;
}

function resolveMetastorageModes(
  overrides: readonly SiteMetastorageRouteInput[] | undefined,
): ReadonlyMap<DomainId, MetastorageRouteMode> {
  const out = new Map<DomainId, MetastorageRouteMode>();
  for (const source of metastorageSources.keys()) out.set(source, "auto");
  for (const entry of overrides ?? []) {
    if (metastorageSources.has(entry.source)) out.set(entry.source, entry.mode);
  }
  return out;
}

function resolveMetastorageRoutes(
  currentDomain: DomainId,
  activeDomains: ReadonlySet<DomainId>,
  routeModes: ReadonlyMap<DomainId, MetastorageRouteMode>,
): MetastorageRouteConfig[] {
  const out: MetastorageRouteConfig[] = [];
  for (const source of metastorageSources.keys()) {
    if (source === currentDomain) continue;
    if (!activeDomains.has(source)) continue;
    const mode = routeModes.get(source) ?? "auto";
    if (mode !== "auto" && mode !== currentDomain) continue;
    const exportCosts = metastorageExports.get(source);
    if (!exportCosts?.size) continue;
    const info = metastorageSources.get(source);
    if (!info) continue;
    out.push({
      sourceDomain: source,
      ttvBudgetPerMinute: info.ttvCapPerCycle / (info.cycleSeconds / 60),
      cycleSeconds: info.cycleSeconds,
      itemCosts: exportCosts,
    });
  }
  return out;
}

function resolveFacilityCaps(
  activeDomains: ReadonlySet<DomainId>,
  researched: ReadonlySet<AicTechId>,
  capOverrides: readonly SiteCapOverrideInput[] | undefined,
  enabledStructures: ReadonlySet<string>,
): ReadonlyMap<FacilityId, number> {
  const overrideMap = new Map<string, number>();
  for (const entry of capOverrides ?? []) {
    if (!Number.isFinite(entry.value) || entry.value < 0) continue;
    overrideMap.set(capKey(entry.facilityId, entry.domainId), entry.value);
  }
  const effective = computeEffectiveCaps(
    researched,
    overrideMap,
    aicNodes,
    facilityBaseCaps,
  );
  const out = new Map<FacilityId, number>();
  for (const [facilityId, perDomain] of effective) {
    let total = 0;
    let anyActive = false;
    for (const [domainId, cap] of perDomain) {
      if (!activeDomains.has(domainId)) continue;
      total += cap;
      anyActive = true;
    }
    if (anyActive) out.set(facilityId, total);
  }
  for (const [domainId, list] of regionStructures) {
    if (!activeDomains.has(domainId)) continue;
    for (const structure of list) {
      if (structure.solver.role !== "instance") continue;
      if (!enabledStructures.has(structureKey(domainId, structure.id))) continue;
      out.set(
        structure.solver.facilityId,
        (out.get(structure.solver.facilityId) ?? 0) + 1,
      );
    }
  }
  return out;
}

function sanitizeMachinesPerVaporizer(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MACHINES_PER_VAPORIZER;
  }
  const rounded = Math.round(value);
  return rounded >= 1 && rounded <= 16
    ? rounded
    : DEFAULT_MACHINES_PER_VAPORIZER;
}

export function buildSiteCalculationContext(
  input: SiteCalculationSettingsInput = {},
): SiteCalculationContext {
  const currentDomain = input.currentDomain ?? defaultCurrentDomain();
  const activeDomains = resolveActiveDomains(currentDomain, input.inactiveDomains);
  const researched = resolveResearched(activeDomains, input.unresearched);
  const enabledStructures = resolveStructures(
    activeDomains,
    input.disabledStructures,
  );

  const unlockedFacilities = computeUnlockedFacilities(researched, activeDomains);
  const unlockedModes = computeUnlockedModes(researched, unlockedFacilities);
  const availableFacilities = computeAvailableFacilities(
    unlockedFacilities,
    facilities,
    currentDomain,
  );

  const availableInstances = new Set<FacilityId>();
  const toggledFacilities = new Set<FacilityId>();
  for (const [domainId, list] of regionStructures) {
    if (!activeDomains.has(domainId)) continue;
    for (const structure of list) {
      if (!enabledStructures.has(structureKey(domainId, structure.id))) continue;
      if (structure.solver.role === "instance") {
        availableInstances.add(structure.solver.facilityId);
      } else {
        toggledFacilities.add(structure.solver.facilityId);
      }
    }
  }
  const structureVariantExcluded = computeVariantExclusions({
    mode: "structure-aware",
    availableInstances,
    toggledFacilities,
  });

  const aicFiltered = computeRecipeAvailability(
    recipes,
    availableFacilities,
    unlockedModes,
  ).availableRecipes;
  const variantFiltered = aicFiltered.filter(
    (recipe) => !structureVariantExcluded.has(recipe.id),
  );

  const routeModes = resolveMetastorageModes(input.metastorageRoutes);
  const resolvedMetastorageRoutes = resolveMetastorageRoutes(
    currentDomain,
    activeDomains,
    routeModes,
  );
  const metastorageSeedItems = new Set<ItemId>();
  for (const route of resolvedMetastorageRoutes) {
    for (const itemId of route.itemCosts.keys()) metastorageSeedItems.add(itemId);
  }

  const regionRawMaterials =
    rawAvailabilityByDomain.get(currentDomain) ?? new Set<ItemId>();
  const withMetastorage = computeRecipeReachability(
    variantFiltered,
    regionRawMaterials,
    bootstrapFacilities,
    metastorageSeedItems,
  );
  const withoutMetastorage = computeRecipeReachability(
    variantFiltered,
    regionRawMaterials,
    bootstrapFacilities,
  );
  const metastorageOnlyItemIds = new Set<ItemId>();
  for (const itemId of withMetastorage.reachableItems) {
    if (!withoutMetastorage.reachableItems.has(itemId)) {
      metastorageOnlyItemIds.add(itemId);
    }
  }

  const facilityCaps = resolveFacilityCaps(
    activeDomains,
    researched,
    input.capOverrides,
    enabledStructures,
  );

  const rawLimitOverrides = new Map<string, number>();
  for (const entry of input.rawLimitOverrides ?? []) {
    if (!Number.isFinite(entry.value) || entry.value < 0) continue;
    rawLimitOverrides.set(rawLimitKey(entry.itemId, entry.domainId), entry.value);
  }
  const rawMaterialCaps = buildRawMaterialCaps(
    defaultRawCapsByDomain.get(currentDomain),
    rawLimitOverrides,
    currentDomain,
  );

  const availableRecipeIds = new Set(
    withMetastorage.runnableRecipes.map((recipe) => recipe.id),
  );
  const prunedRecipeOverrides: SiteRecipeOverrideInput[] = [];
  const recipeOverrides = new Map<ItemId, RecipeId>();
  for (const entry of input.recipeOverrides ?? []) {
    if (!availableRecipeIds.has(entry.recipeId)) {
      prunedRecipeOverrides.push(entry);
      continue;
    }
    recipeOverrides.set(entry.itemId, entry.recipeId);
  }

  const producibleItems = new Set<ItemId>();
  for (const recipe of withMetastorage.runnableRecipes) {
    for (const output of recipe.outputs) producibleItems.add(output.itemId);
  }
  const importableItems = new Set<ItemId>();
  for (const route of resolvedMetastorageRoutes) {
    for (const itemId of route.itemCosts.keys()) importableItems.add(itemId);
  }

  const prunedManualRawMaterials: ItemId[] = [];
  const manualRawMaterials = new Set<ItemId>();
  for (const itemId of input.manualRawMaterials ?? []) {
    if (
      producibleItems.has(itemId) ||
      regionRawMaterials.has(itemId) ||
      importableItems.has(itemId)
    ) {
      manualRawMaterials.add(itemId);
    } else {
      prunedManualRawMaterials.push(itemId);
    }
  }

  const machinesPerVaporizer = sanitizeMachinesPerVaporizer(
    input.machinesPerVaporizer,
  );
  const options: CalculateProductionPlanOptions = {
    rawMaterials: regionRawMaterials,
    rawCaps: rawMaterialCaps,
    recipeOverrides,
    manualRawMaterials,
    facilityCaps,
    metastorageRoutes: resolvedMetastorageRoutes,
    powerSustain: input.powerSustain ? { fuels: powerFuels } : undefined,
    gasSustain:
      machinesPerVaporizer !== DEFAULT_MACHINES_PER_VAPORIZER
        ? { machinesPerVaporizer }
        : undefined,
  };

  return {
    currentDomain,
    activeDomains,
    researched,
    enabledStructures,
    availableRecipes: withMetastorage.runnableRecipes,
    reachableItems: withMetastorage.reachableItems,
    metastorageOnlyItemIds,
    regionRawMaterials,
    facilityCaps,
    rawMaterialCaps,
    metastorageRoutes: resolvedMetastorageRoutes,
    options,
    prunedRecipeOverrides,
    prunedManualRawMaterials,
  };
}

export async function solveSiteCalculation(
  targets: readonly SiteTargetInput[],
  settings: SiteCalculationSettingsInput = {},
): Promise<SiteSolveResult> {
  const context = buildSiteCalculationContext(settings);
  const locallyProducible = new Set<ItemId>();
  for (const recipe of context.availableRecipes) {
    for (const output of recipe.outputs) locallyProducible.add(output.itemId);
  }
  const importable = new Set<ItemId>();
  for (const route of context.metastorageRoutes) {
    for (const itemId of route.itemCosts.keys()) importable.add(itemId);
  }

  const keptTargets: SiteTargetInput[] = [];
  const prunedTargets: SiteTargetInput[] = [];
  for (const target of targets) {
    if (locallyProducible.has(target.itemId) || importable.has(target.itemId)) {
      keptTargets.push(target);
    } else {
      prunedTargets.push(target);
    }
  }
  if (keptTargets.length === 0) {
    throw new Error("No calculable targets remain after applying site settings");
  }

  const plan = await calculateProductionPlan(
    keptTargets.map(({ itemId, rate }) => ({ itemId, rate })),
    items,
    context.availableRecipes,
    facilities,
    context.options,
  );

  return {
    context,
    targets: keptTargets,
    prunedTargets,
    plan,
  };
}
