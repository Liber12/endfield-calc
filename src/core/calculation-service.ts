import { facilities, items } from "@/data";
import { calculateProductionPlan } from "@/lib/calculator";
import {
  fitTargetsToLimits,
  maximizeTargetRate,
  type FitResult,
  type MaximizeResult,
} from "@/lib/target-optimizer";
import type { ItemId, ProductionDependencyGraph } from "@/types";
import {
  solveSiteCalculation,
  type SiteCalculationContext,
  type SiteCalculationSettingsInput,
  type SiteTargetInput,
} from "@/core/site-environment";

export type CalculationCommand = "plan" | "max" | "fit";

export interface CalculationRequest {
  command: CalculationCommand;
  targets: readonly SiteTargetInput[];
  settings?: SiteCalculationSettingsInput;
  /** Required when command === "max". */
  maxItemId?: ItemId;
}

export interface CalculationResult {
  readonly command: CalculationCommand;
  readonly context: SiteCalculationContext;
  readonly targets: readonly SiteTargetInput[];
  readonly prunedTargets: readonly SiteTargetInput[];
  readonly optimizer?: MaximizeResult | FitResult;
  readonly plan: ProductionDependencyGraph;
}

/**
 * Application-core calculation service shared by every interface.
 *
 * It owns command semantics (plan / priority-Max / fit-to-limits) and the
 * solve lifecycle. Interfaces are responsible only for translating their
 * external input into a typed CalculationRequest and presenting the result.
 */
export async function runCalculation(
  request: CalculationRequest,
): Promise<CalculationResult> {
  if (request.targets.length === 0) {
    throw new Error("At least one target is required");
  }

  const settings = request.settings ?? {};
  const base = await solveSiteCalculation(request.targets, settings);
  let finalTargets = [...base.targets];
  let finalPlan = base.plan;
  let optimizer: MaximizeResult | FitResult | undefined;

  const solve = (vector: Array<{ itemId: ItemId; rate: number }>) =>
    calculateProductionPlan(
      vector,
      items,
      base.context.availableRecipes,
      facilities,
      base.context.options,
    );

  const resolveFinalPlan = () =>
    calculateProductionPlan(
      finalTargets.map(({ itemId, rate }) => ({ itemId, rate })),
      items,
      base.context.availableRecipes,
      facilities,
      base.context.options,
    );

  if (request.command === "max") {
    if (!request.maxItemId) {
      throw new Error("max requires maxItemId");
    }

    const index = finalTargets.findIndex(
      (target) => target.itemId === request.maxItemId,
    );
    if (index < 0) {
      throw new Error(
        "Max target is not in the calculable target list: " +
          request.maxItemId,
      );
    }

    const result = await maximizeTargetRate({
      targets: finalTargets,
      index,
      solve,
    });
    optimizer = result;

    if (result.kind === "ok") {
      finalTargets = finalTargets.map((target, i) => {
        if (i === index) return { ...target, rate: result.rate };
        const rate = result.otherRates.get(i);
        return rate === undefined ? target : { ...target, rate };
      });
      finalPlan = await resolveFinalPlan();
    }
  } else if (request.command === "fit") {
    const result = await fitTargetsToLimits({
      targets: finalTargets,
      solve,
    });
    optimizer = result;

    if (result.kind === "ok") {
      finalTargets = finalTargets.map((target, i) => {
        const rate = result.rates.get(i);
        return rate === undefined ? target : { ...target, rate };
      });
      finalPlan = await resolveFinalPlan();
    }
  }

  return {
    command: request.command,
    context: base.context,
    targets: finalTargets,
    prunedTargets: base.prunedTargets,
    ...(optimizer ? { optimizer } : {}),
    plan: finalPlan,
  };
}
