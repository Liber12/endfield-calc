import {
  facilities,
  items,
  metastorageSources,
  recipes,
  regionStructures,
} from "@/data";
import { aicNodes, domains } from "@/data/aic-plans";
import type {
  SiteCalculationSettingsInput,
  SiteTargetInput,
} from "@/core/calculation";
import type { CliConfig, ParsedCliArgs } from "@/interfaces/cli/types";
import type { DomainId } from "@/types/domain";
import type { FacilityId, ItemId, RecipeId } from "@/types";
import type { AicTechId } from "@/types/aic";
import type { RegionStructureId } from "@/types/constants";
import type { MetastorageRouteMode } from "@/types/metastorage";

const itemIds = new Set(items.map((x) => x.id as string));
const recipeIds = new Set(recipes.map((x) => x.id as string));
const facilityIds = new Set(facilities.map((x) => x.id as string));
const domainIds = new Set(domains.map((x) => x.id as string));
const techIds = new Set(aicNodes.map((x) => x.id as string));
const structurePairs = new Set<string>();

for (const [domainId, list] of regionStructures) {
  for (const structure of list) {
    structurePairs.add(domainId + "\u0000" + structure.id);
  }
}

function requireId(
  kind: string,
  value: string,
  known: ReadonlySet<string>,
): string {
  if (!known.has(value)) throw new Error("Unknown " + kind + ": " + value);
  return value;
}

export function requireKnownItemId(value: string): ItemId {
  return requireId("item id", value, itemIds) as ItemId;
}

export function parseCliConfig(raw: string): CliConfig {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config root must be a JSON object");
  }
  return parsed as CliConfig;
}

function parseTarget(text: string): SiteTargetInput {
  const colon = text.lastIndexOf(":");
  if (colon <= 0) throw new Error("Invalid target: " + text);
  const itemId = text.slice(0, colon);
  let rateText = text.slice(colon + 1);
  const locked = rateText.endsWith("l");
  if (locked) rateText = rateText.slice(0, -1);
  const rate = Number(rateText);
  requireId("item id", itemId, itemIds);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error("Invalid target rate: " + text);
  }
  return {
    itemId: itemId as ItemId,
    rate,
    ...(locked ? { locked: true } : {}),
  };
}

export function targetsFromCli(
  config: CliConfig,
  argTargets: readonly string[],
): SiteTargetInput[] {
  if (argTargets.length > 0) return argTargets.map(parseTarget);

  return (config.targets ?? []).map((target) => {
    requireId("item id", target.itemId, itemIds);
    if (!Number.isFinite(target.rate) || target.rate < 0) {
      throw new Error("Invalid target rate for " + target.itemId);
    }
    return {
      itemId: target.itemId as ItemId,
      rate: target.rate,
      ...(target.locked ? { locked: true } : {}),
    };
  });
}

export function settingsFromCli(
  config: CliConfig,
  args: ParsedCliArgs,
): SiteCalculationSettingsInput {
  const settings = config.settings ?? {};
  const plan = config.plan ?? {};
  const current = args.domain ?? settings.domains?.current;
  if (current !== undefined) requireId("domain id", current, domainIds);

  const inactiveDomains = settings.domains?.inactive?.map(
    (id) => requireId("domain id", id, domainIds) as DomainId,
  );
  const unresearched = settings.aic?.unresearched?.map(
    (id) => requireId("AIC tech id", id, techIds) as AicTechId,
  );
  const capOverrides = settings.aic?.capOverrides?.map((entry) => {
    requireId("facility id", entry.facilityId, facilityIds);
    requireId("domain id", entry.domainId, domainIds);
    if (!Number.isFinite(entry.value) || entry.value < 0) {
      throw new Error("Invalid facility cap for " + entry.facilityId);
    }
    return {
      facilityId: entry.facilityId as FacilityId,
      domainId: entry.domainId as DomainId,
      value: entry.value,
    };
  });
  const rawLimitOverrides = settings.rawLimits?.overrides?.map((entry) => {
    requireId("item id", entry.itemId, itemIds);
    requireId("domain id", entry.domainId, domainIds);
    if (!Number.isFinite(entry.value) || entry.value < 0) {
      throw new Error("Invalid raw limit for " + entry.itemId);
    }
    return {
      itemId: entry.itemId as ItemId,
      domainId: entry.domainId as DomainId,
      value: entry.value,
    };
  });
  const disabledStructures = settings.structures?.disabled?.map((entry) => {
    requireId("domain id", entry.domainId, domainIds);
    const pair = entry.domainId + "\u0000" + entry.structureId;
    if (!structurePairs.has(pair)) {
      throw new Error(
        "Unknown structure for " + entry.domainId + ": " + entry.structureId,
      );
    }
    return {
      domainId: entry.domainId as DomainId,
      structureId: entry.structureId as RegionStructureId,
    };
  });
  const metastorageRoutes = settings.metastorage?.routes?.map((entry) => {
    requireId("Metastorage source domain", entry.source, domainIds);
    if (!metastorageSources.has(entry.source as DomainId)) {
      throw new Error("Domain has no Metastorage source: " + entry.source);
    }
    if (
      entry.mode !== "auto" &&
      entry.mode !== "disabled" &&
      !domainIds.has(entry.mode)
    ) {
      throw new Error("Invalid Metastorage route mode: " + entry.mode);
    }
    return {
      source: entry.source as DomainId,
      mode: entry.mode as MetastorageRouteMode,
    };
  });
  const recipeOverrides = plan.recipeOverrides?.map((entry) => ({
    itemId: requireId("item id", entry.itemId, itemIds) as ItemId,
    recipeId: requireId("recipe id", entry.recipeId, recipeIds) as RecipeId,
  }));
  const manualRawMaterials = plan.manualRawMaterials?.map(
    (id) => requireId("item id", id, itemIds) as ItemId,
  );

  const mpv = args.machinesPerVaporizer ?? plan.machinesPerVaporizer;
  if (mpv !== undefined && (!Number.isFinite(mpv) || mpv < 1 || mpv > 16)) {
    throw new Error("machinesPerVaporizer must be between 1 and 16");
  }

  return {
    ...(current ? { currentDomain: current as DomainId } : {}),
    ...(inactiveDomains ? { inactiveDomains } : {}),
    ...(unresearched ? { unresearched } : {}),
    ...(capOverrides ? { capOverrides } : {}),
    ...(rawLimitOverrides ? { rawLimitOverrides } : {}),
    ...(disabledStructures ? { disabledStructures } : {}),
    ...(metastorageRoutes ? { metastorageRoutes } : {}),
    ...(recipeOverrides ? { recipeOverrides } : {}),
    ...(manualRawMaterials ? { manualRawMaterials } : {}),
    powerSustain: args.powerSustain ?? plan.powerSustain ?? false,
    ...(mpv !== undefined ? { machinesPerVaporizer: mpv } : {}),
  };
}
