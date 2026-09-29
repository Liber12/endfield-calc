import {
  runCalculation,
  type CalculationCommand,
  type CalculationRequest,
  type CalculationResult,
  type SiteCalculationSettingsInput,
  type SiteTargetInput,
} from "../../src/core";
import {
  facilities,
  items,
  metastorageSources,
  recipes,
  regionStructures,
} from "../../src/data";
import { aicNodes, domains } from "../../src/data/aic-plans";
import type { AicTechId } from "../../src/types/aic";
import type { DomainId } from "../../src/types/domain";
import type {
  FacilityId,
  ItemId,
  RecipeId,
} from "../../src/types";
import type { RegionStructureId } from "../../src/types/constants";
import type { MetastorageRouteMode } from "../../src/types/metastorage";

export interface CliConfig {
  targets?: Array<{ itemId: string; rate: number; locked?: boolean }>;
  settings?: {
    domains?: { current?: string; inactive?: string[] };
    aic?: {
      unresearched?: string[];
      capOverrides?: Array<{
        facilityId: string;
        domainId: string;
        value: number;
      }>;
    };
    rawLimits?: {
      overrides?: Array<{ itemId: string; domainId: string; value: number }>;
    };
    structures?: {
      disabled?: Array<{ domainId: string; structureId: string }>;
    };
    metastorage?: {
      routes?: Array<{ source: string; mode: string }>;
    };
  };
  plan?: {
    recipeOverrides?: Array<{ itemId: string; recipeId: string }>;
    manualRawMaterials?: string[];
    powerSustain?: boolean;
    machinesPerVaporizer?: number;
  };
}

export interface ParsedArgs {
  command: CalculationCommand;
  configPath?: string;
  domain?: string;
  targets: string[];
  maxItem?: string;
  powerSustain?: boolean;
  machinesPerVaporizer?: number;
  pretty: boolean;
  help: boolean;
}

export const HELP = [
  "Endfield Calc CLI",
  "",
  "Usage:",
  "  pnpm calc -- plan --target item_iron_powder:60 [options]",
  "  pnpm calc -- max --config plan.json --item item_iron_powder",
  "  pnpm calc -- fit --config plan.json",
  "",
  "Options:",
  "  --config <path|->        JSON config file, or - for stdin",
  "  --domain <domain_id>     Override the current factory region",
  "  --target <item:rate[l]>  Add/replace targets; repeatable. l locks it",
  "  --item <item_id>         Target to maximize for max",
  "  --power-sustain          Enable self-sustaining power",
  "  --no-power-sustain       Disable self-sustaining power",
  "  --mpv <1..16>            Machines per gas vaporizer",
  "  --pretty                 Pretty-print JSON",
  "  --help                   Show this help",
  "",
  "The JSON config mirrors the web app: settings contains persisted region",
  "settings (domains/aic/rawLimits/structures/metastorage), while plan contains",
  "recipe overrides, manual raws, self-power, and gas coverage.",
].join("\n");

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

export function parseArgs(argv: readonly string[]): ParsedArgs {
  let command: CalculationCommand = "plan";
  let i = 0;

  if (argv[0] === "plan" || argv[0] === "max" || argv[0] === "fit") {
    command = argv[0];
    i = 1;
  }

  const out: ParsedArgs = {
    command,
    targets: [],
    pretty: false,
    help: false,
  };

  for (; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error("Missing value for " + arg);
      return value;
    };

    switch (arg) {
      case "--config":
        out.configPath = next();
        break;
      case "--domain":
        out.domain = next();
        break;
      case "--target":
        out.targets.push(next());
        break;
      case "--item":
        out.maxItem = next();
        break;
      case "--power-sustain":
        out.powerSustain = true;
        break;
      case "--no-power-sustain":
        out.powerSustain = false;
        break;
      case "--mpv":
        out.machinesPerVaporizer = Number(next());
        break;
      case "--pretty":
        out.pretty = true;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error("Unknown argument: " + arg);
    }
  }

  return out;
}

export function parseConfig(raw: string | undefined): CliConfig {
  if (raw === undefined || raw.trim() === "") return {};
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

function targetsFromConfig(
  config: CliConfig,
  argTargets: readonly string[],
): SiteTargetInput[] {
  if (argTargets.length > 0) return argTargets.map(parseTarget);

  const out: SiteTargetInput[] = [];
  for (const target of config.targets ?? []) {
    requireId("item id", target.itemId, itemIds);
    if (!Number.isFinite(target.rate) || target.rate < 0) {
      throw new Error("Invalid target rate for " + target.itemId);
    }
    out.push({
      itemId: target.itemId as ItemId,
      rate: target.rate,
      ...(target.locked ? { locked: true } : {}),
    });
  }
  return out;
}

function settingsFromConfig(
  config: CliConfig,
  args: ParsedArgs,
): SiteCalculationSettingsInput {
  const settings = config.settings ?? {};
  const plan = config.plan ?? {};
  const current = args.domain ?? settings.domains?.current;

  if (current !== undefined) requireId("domain id", current, domainIds);

  const inactive = settings.domains?.inactive?.map((id) => {
    requireId("domain id", id, domainIds);
    return id as DomainId;
  });

  const unresearched = settings.aic?.unresearched?.map((id) => {
    requireId("AIC tech id", id, techIds);
    return id as AicTechId;
  });

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

  const recipeOverrides = plan.recipeOverrides?.map((entry) => {
    requireId("item id", entry.itemId, itemIds);
    requireId("recipe id", entry.recipeId, recipeIds);
    return {
      itemId: entry.itemId as ItemId,
      recipeId: entry.recipeId as RecipeId,
    };
  });

  const manualRawMaterials = plan.manualRawMaterials?.map((id) => {
    requireId("item id", id, itemIds);
    return id as ItemId;
  });

  const mpv = args.machinesPerVaporizer ?? plan.machinesPerVaporizer;
  if (mpv !== undefined && (!Number.isFinite(mpv) || mpv < 1 || mpv > 16)) {
    throw new Error("machinesPerVaporizer must be between 1 and 16");
  }

  return {
    ...(current ? { currentDomain: current as DomainId } : {}),
    ...(inactive ? { inactiveDomains: inactive } : {}),
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

export function buildCalculationRequest(
  args: ParsedArgs,
  config: CliConfig,
): CalculationRequest {
  const targets = targetsFromConfig(config, args.targets);
  if (targets.length === 0) {
    throw new Error("At least one target is required");
  }

  let maxItemId: ItemId | undefined;
  if (args.command === "max") {
    if (!args.maxItem) throw new Error("max requires --item <item_id>");
    requireId("item id", args.maxItem, itemIds);
    maxItemId = args.maxItem as ItemId;
  }

  return {
    command: args.command,
    targets,
    settings: settingsFromConfig(config, args),
    ...(maxItemId ? { maxItemId } : {}),
  };
}

function environmentSummary(result: CalculationResult) {
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

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

export function serializeCalculationResult(
  result: CalculationResult,
  pretty = false,
): string {
  const output = {
    schemaVersion: 1,
    command: result.command,
    targets: result.targets,
    environment: environmentSummary(result),
    ...(result.optimizer ? { optimizer: result.optimizer } : {}),
    plan: result.plan,
  };

  return JSON.stringify(output, jsonReplacer, pretty ? 2 : 0);
}

export async function executeCalcCli(
  argv: readonly string[],
  loadConfig: (path: string) => string,
): Promise<{ kind: "help"; text: string } | { kind: "result"; text: string }> {
  const args = parseArgs(argv);
  if (args.help) return { kind: "help", text: HELP };

  const rawConfig = args.configPath
    ? loadConfig(args.configPath)
    : undefined;
  const config = parseConfig(rawConfig);
  const request = buildCalculationRequest(args, config);
  const result = await runCalculation(request);

  return {
    kind: "result",
    text: serializeCalculationResult(result, args.pretty),
  };
}
