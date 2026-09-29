#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import {
  buildSiteCalculationContext,
  solveSiteCalculation,
  type SiteCalculationSettingsInput,
  type SiteTargetInput,
} from "../src/lib/calc-environment";
import { calculateProductionPlan } from "../src/lib/calculator";
import {
  fitTargetsToLimits,
  maximizeTargetRate,
} from "../src/lib/target-optimizer";
import {
  facilities,
  items,
  metastorageSources,
  recipes,
  regionStructures,
} from "../src/data";
import { aicNodes, domains } from "../src/data/aic-plans";
import type { DomainId } from "../src/types/domain";
import type {
  FacilityId,
  ItemId,
  RecipeId,
} from "../src/types";
import type { AicTechId } from "../src/types/aic";
import type { RegionStructureId } from "../src/types/constants";
import type { MetastorageRouteMode } from "../src/types/metastorage";

type Command = "plan" | "max" | "fit";

interface CliConfig {
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

interface ParsedArgs {
  command: Command;
  configPath?: string;
  domain?: string;
  targets: string[];
  maxItem?: string;
  powerSustain?: boolean;
  machinesPerVaporizer?: number;
  pretty: boolean;
  help: boolean;
}

const HELP = [
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

function parseArgs(argv: string[]): ParsedArgs {
  let command: Command = "plan";
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

function readConfig(path: string | undefined): CliConfig {
  if (!path) return {};
  const raw = path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config root must be a JSON object");
  }
  return parsed as CliConfig;
}

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

function requireId(kind: string, value: string, known: ReadonlySet<string>): string {
  if (!known.has(value)) throw new Error("Unknown " + kind + ": " + value);
  return value;
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

function targetsFromConfig(config: CliConfig, argTargets: string[]): SiteTargetInput[] {
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

function environmentSummary(result: Awaited<ReturnType<typeof solveSiteCalculation>>) {
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

async function solveVector(
  targets: readonly SiteTargetInput[],
  settings: SiteCalculationSettingsInput,
) {
  const context = buildSiteCalculationContext(settings);
  const plan = await calculateProductionPlan(
    targets.map(({ itemId, rate }) => ({ itemId, rate })),
    items,
    context.availableRecipes,
    facilities,
    context.options,
  );
  return { context, plan };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP + "\n");
    return;
  }

  const config = readConfig(args.configPath);
  const targets = targetsFromConfig(config, args.targets);
  if (targets.length === 0) {
    throw new Error("At least one target is required");
  }
  const settings = settingsFromConfig(config, args);
  const base = await solveSiteCalculation(targets, settings);
  let finalTargets = [...base.targets];
  let optimizer: unknown = null;
  let finalPlan = base.plan;

  const directSolve = (vector: Array<{ itemId: ItemId; rate: number }>) =>
    calculateProductionPlan(
      vector,
      items,
      base.context.availableRecipes,
      facilities,
      base.context.options,
    );

  if (args.command === "max") {
    if (!args.maxItem) throw new Error("max requires --item <item_id>");
    requireId("item id", args.maxItem, itemIds);
    const index = finalTargets.findIndex((t) => t.itemId === args.maxItem);
    if (index < 0) throw new Error("Max target is not in the target list: " + args.maxItem);
    const result = await maximizeTargetRate({
      targets: finalTargets,
      index,
      solve: directSolve,
    });
    optimizer = result;
    if (result.kind === "ok") {
      finalTargets = finalTargets.map((target, i) => {
        if (i === index) return { ...target, rate: result.rate };
        const rate = result.otherRates.get(i);
        return rate === undefined ? target : { ...target, rate };
      });
      finalPlan = (await solveVector(finalTargets, settings)).plan;
    }
  } else if (args.command === "fit") {
    const result = await fitTargetsToLimits({
      targets: finalTargets,
      solve: directSolve,
    });
    optimizer = result;
    if (result.kind === "ok") {
      finalTargets = finalTargets.map((target, i) => {
        const rate = result.rates.get(i);
        return rate === undefined ? target : { ...target, rate };
      });
      finalPlan = (await solveVector(finalTargets, settings)).plan;
    }
  }

  const output = {
    schemaVersion: 1,
    command: args.command,
    targets: finalTargets,
    environment: environmentSummary(base),
    ...(optimizer ? { optimizer } : {}),
    plan: finalPlan,
  };
  const spacing = args.pretty ? 2 : 0;
  process.stdout.write(JSON.stringify(output, jsonReplacer, spacing) + "\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write("endfield-calc: " + message + "\n");
  process.exitCode = 1;
});
