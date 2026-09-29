import { describe, expect, test } from "vitest";

import {
  buildCalculationRequest,
  parseArgs,
  parseConfig,
} from "../../../scripts/cli/calc-cli";
import { DomainId, ItemId } from "@/types/constants";

describe("CLI calculation interface", () => {
  test("translates argv into a typed core request", () => {
    const args = parseArgs([
      "plan",
      "--domain",
      DomainId.DOMAIN_1,
      "--target",
      `${ItemId.ITEM_IRON_POWDER}:30l`,
      "--power-sustain",
    ]);

    const request = buildCalculationRequest(args, {});

    expect(request.command).toBe("plan");
    expect(request.targets).toEqual([
      {
        itemId: ItemId.ITEM_IRON_POWDER,
        rate: 30,
        locked: true,
      },
    ]);
    expect(request.settings?.currentDomain).toBe(DomainId.DOMAIN_1);
    expect(request.settings?.powerSustain).toBe(true);
  });

  test("parses the JSON interface without invoking the solver", () => {
    const config = parseConfig(
      JSON.stringify({
        targets: [{ itemId: ItemId.ITEM_IRON_POWDER, rate: 12 }],
      }),
    );

    const request = buildCalculationRequest(parseArgs(["plan"]), config);

    expect(request.targets).toEqual([
      { itemId: ItemId.ITEM_IRON_POWDER, rate: 12 },
    ]);
  });

  test("rejects unknown IDs at the interface boundary", () => {
    expect(() =>
      buildCalculationRequest(
        parseArgs(["plan", "--target", "item_does_not_exist:1"]),
        {},
      ),
    ).toThrow("Unknown item id");
  });
});
