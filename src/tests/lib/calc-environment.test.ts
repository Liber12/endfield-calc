import { describe, expect, test } from "vitest";
import {
  buildSiteCalculationContext,
  solveSiteCalculation,
} from "@/core";
import { aicNodes } from "@/data/aic-plans";
import { DomainId, FacilityId, ItemId, RecipeId } from "@/types/constants";

describe("site calculation environment", () => {
  test("uses the pinned starting region and its site defaults", () => {
    const context = buildSiteCalculationContext();

    expect(context.currentDomain).toBe(DomainId.DOMAIN_1);
    expect(context.activeDomains.has(DomainId.DOMAIN_1)).toBe(true);
    expect(context.activeDomains.has(DomainId.DOMAIN_2)).toBe(false);
    expect(
      context.availableRecipes.some(
        (recipe) => recipe.id === RecipeId.GRINDER_IRON_POWDER_1,
      ),
    ).toBe(true);
  });

  test("selecting Wuling activates it and enables default region structures", () => {
    const context = buildSiteCalculationContext({
      currentDomain: DomainId.DOMAIN_2,
    });

    expect(context.activeDomains.has(DomainId.DOMAIN_1)).toBe(true);
    expect(context.activeDomains.has(DomainId.DOMAIN_2)).toBe(true);
    expect(context.facilityCaps.get(FacilityId.LIQUID_CLEAN_GATE_1)).toBe(3);
  });

  test("unresearched AIC nodes remove their recipes from the CLI problem", () => {
    const grinderTech = aicNodes.find(
      (node) =>
        node.action.kind === "unlock" &&
        node.action.facilityId === FacilityId.GRINDER_1,
    );
    if (!grinderTech) throw new Error("grinder AIC node missing from fixture");

    const context = buildSiteCalculationContext({
      unresearched: [grinderTech.id],
    });

    expect(
      context.availableRecipes.some(
        (recipe) => recipe.id === RecipeId.GRINDER_IRON_POWDER_1,
      ),
    ).toBe(false);
  });

  test("solves through the same production calculator without React", async () => {
    const result = await solveSiteCalculation([
      { itemId: ItemId.ITEM_IRON_POWDER, rate: 30 },
    ]);

    expect(result.prunedTargets).toEqual([]);
    expect(result.plan.lpStatus).toBe("ok");
    expect(result.plan.nodes.has(ItemId.ITEM_IRON_POWDER)).toBe(true);
    expect(result.plan.nodes.has(RecipeId.GRINDER_IRON_POWDER_1)).toBe(true);
  });

  test("prunes site-incompatible targets before solving", async () => {
    const grinderTech = aicNodes.find(
      (node) =>
        node.action.kind === "unlock" &&
        node.action.facilityId === FacilityId.GRINDER_1,
    );
    if (!grinderTech) throw new Error("grinder AIC node missing from fixture");

    await expect(
      solveSiteCalculation(
        [{ itemId: ItemId.ITEM_IRON_POWDER, rate: 30 }],
        { unresearched: [grinderTech.id] },
      ),
    ).rejects.toThrow("No calculable targets remain");
  });
});
