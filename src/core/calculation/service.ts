import { calculateProductionPlan } from "@/lib/calculator";
import {
  fitTargetsToLimits,
  maximizeTargetRate,
} from "@/lib/target-optimizer";
import type { ItemId, ProductionDependencyGraph } from "@/types";
import {
  buildSiteCalculationContext,
  solveSiteCalculation,
  type SiteCalculationContext,
  type SiteCalculationSettingsInput,
  type SiteSolveResult,
  type SiteTargetInput,
} from "@/core/calculation/environment";
import type { CalculationProblem } from "@/core/calculation/problem";

export interface SiteOptimizationResult<TOptimizer> {
  readonly base: SiteSolveResult;
  readonly targets: readonly SiteTargetInput[];
  readonly optimizer: TOptimizer;
  readonly plan: ProductionDependencyGraph;
}

export async function solveCalculationProblem(
  problem: CalculationProblem,
  targets: readonly Pick<SiteTargetInput, "itemId" | "rate">[],
): Promise<ProductionDependencyGraph> {
  return calculateProductionPlan(
    targets,
    problem.items,
    problem.recipes,
    problem.facilities,
    problem.options,
  );
}

async function solveWithContext(
  context: SiteCalculationContext,
  targets: readonly SiteTargetInput[],
): Promise<ProductionDependencyGraph> {
  return solveCalculationProblem(
    context.problem,
    targets.map(({ itemId, rate }) => ({ itemId, rate })),
  );
}

export async function maximizeSiteTarget(
  targets: readonly SiteTargetInput[],
  settings: SiteCalculationSettingsInput,
  itemId: ItemId,
): Promise<
  SiteOptimizationResult<Awaited<ReturnType<typeof maximizeTargetRate>>>
> {
  const base = await solveSiteCalculation(targets, settings);
  const index = base.targets.findIndex((target) => target.itemId === itemId);
  if (index < 0) {
    throw new Error(`Max target is not in the target list: ${itemId}`);
  }

  const optimizer = await maximizeTargetRate({
    targets: base.targets,
    index,
    solve: (vector) => solveCalculationProblem(base.context.problem, vector),
  });

  let finalTargets = [...base.targets];
  let plan = base.plan;

  if (optimizer.kind === "ok") {
    finalTargets = finalTargets.map((target, targetIndex) => {
      if (targetIndex === index) return { ...target, rate: optimizer.rate };
      const rate = optimizer.otherRates.get(targetIndex);
      return rate === undefined ? target : { ...target, rate };
    });
    plan = await solveWithContext(base.context, finalTargets);
  }

  return { base, targets: finalTargets, optimizer, plan };
}

export async function fitSiteTargets(
  targets: readonly SiteTargetInput[],
  settings: SiteCalculationSettingsInput,
): Promise<SiteOptimizationResult<Awaited<ReturnType<typeof fitTargetsToLimits>>>> {
  const base = await solveSiteCalculation(targets, settings);

  const optimizer = await fitTargetsToLimits({
    targets: base.targets,
    solve: (vector) => solveCalculationProblem(base.context.problem, vector),
  });

  let finalTargets = [...base.targets];
  let plan = base.plan;

  if (optimizer.kind === "ok") {
    finalTargets = finalTargets.map((target, targetIndex) => {
      const rate = optimizer.rates.get(targetIndex);
      return rate === undefined ? target : { ...target, rate };
    });
    plan = await solveWithContext(base.context, finalTargets);
  }

  return { base, targets: finalTargets, optimizer, plan };
}

export { buildSiteCalculationContext, solveSiteCalculation };
export type {
  SiteCalculationContext,
  SiteCalculationSettingsInput,
  SiteSolveResult,
  SiteTargetInput,
};
