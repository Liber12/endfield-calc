import {
  fitSiteTargets,
  maximizeSiteTarget,
  solveSiteCalculation,
} from "@/core/calculation";
import { CLI_HELP, parseCliArgs } from "@/interfaces/cli/args";
import {
  readCliConfig,
  requireKnownItemId,
  settingsFromCli,
  targetsFromCli,
} from "@/interfaces/cli/config";
import {
  cliJsonReplacer,
  environmentSummary,
} from "@/interfaces/cli/output";

export interface CliExecutionResult {
  stdout: string;
}

export async function executeCli(
  argv: readonly string[],
): Promise<CliExecutionResult> {
  const args = parseCliArgs(argv);
  if (args.help) return { stdout: CLI_HELP + "\n" };

  const config = readCliConfig(args.configPath);
  const targets = targetsFromCli(config, args.targets);
  if (targets.length === 0) {
    throw new Error("At least one target is required");
  }

  const settings = settingsFromCli(config, args);
  let base;
  let finalTargets;
  let finalPlan;
  let optimizer: unknown = null;

  if (args.command === "max") {
    if (!args.maxItem) throw new Error("max requires --item <item_id>");
    const result = await maximizeSiteTarget(
      targets,
      settings,
      requireKnownItemId(args.maxItem),
    );
    base = result.base;
    finalTargets = result.targets;
    finalPlan = result.plan;
    optimizer = result.optimizer;
  } else if (args.command === "fit") {
    const result = await fitSiteTargets(targets, settings);
    base = result.base;
    finalTargets = result.targets;
    finalPlan = result.plan;
    optimizer = result.optimizer;
  } else {
    base = await solveSiteCalculation(targets, settings);
    finalTargets = base.targets;
    finalPlan = base.plan;
  }

  const output = {
    schemaVersion: 1,
    command: args.command,
    targets: finalTargets,
    environment: environmentSummary(base),
    ...(optimizer ? { optimizer } : {}),
    plan: finalPlan,
  };

  return {
    stdout:
      JSON.stringify(output, cliJsonReplacer, args.pretty ? 2 : 0) + "\n",
  };
}
