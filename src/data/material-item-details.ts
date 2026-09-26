import type { ItemId } from "@/types";

export type MaterialItemDetail = {
  kind: "description" | "effect";
  text: string;
  sourcePage: string;
};

/** Compact functional item text extracted from Wikiru item tables.
 * Flavor/lore columns are intentionally not copied.
 * Last generated: 2026-09-27.
 */
export const materialItemDetails: Readonly<Record<string, MaterialItemDetail>> = {};

export function getMaterialItemDetail(itemId: ItemId): MaterialItemDetail | undefined {
  return materialItemDetails[itemId];
}
