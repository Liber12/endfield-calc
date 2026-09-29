import type { Item } from "@/types";

export type MaterialCategoryId =
  | "natural"
  | "gathered"
  | "industrial"
  | "consumable"
  | "event"
  | "other";

export type MaterialSubtypeId =
  | "ore"
  | "plant"
  | "seed"
  | "powder"
  | "refined"
  | "liquid"
  | "gas"
  | "container"
  | "filled"
  | "component"
  | "battery"
  | "equipment"
  | "medicine"
  | "food"
  | "bomb"
  | "event"
  | "other";


export type MaterialGroupId =
  | "rawOre"
  | "rawLiquid"
  | "rawGas"
  | "plant"
  | "seed"
  | "powder"
  | "refined"
  | "industrialLiquid"
  | "industrialGas"
  | "container"
  | "filledContainer"
  | "component"
  | "battery"
  | "equipment"
  | "medicine"
  | "food"
  | "bomb"
  | "event"
  | "other";

export const MATERIAL_GROUP_ORDER: readonly MaterialGroupId[] = [
  "rawOre",
  "rawLiquid",
  "rawGas",
  "plant",
  "seed",
  "powder",
  "refined",
  "industrialLiquid",
  "industrialGas",
  "container",
  "filledContainer",
  "component",
  "battery",
  "equipment",
  "medicine",
  "food",
  "bomb",
  "event",
  "other",
];

export const MATERIAL_CATEGORY_ORDER: readonly MaterialCategoryId[] = [
  "natural",
  "gathered",
  "industrial",
  "consumable",
  "event",
  "other",
];

export function getMaterialSubtype(item: Item): MaterialSubtypeId {
  const id = item.id;

  if (id.startsWith("item_activity_")) return "event";
  if (id.startsWith("item_proc_battery_")) return "battery";
  if (id.startsWith("item_equip_script_")) return "equipment";
  if (id.startsWith("item_bottled_food_")) return "food";
  if (id.startsWith("item_bottled_rec_")) return "medicine";
  if (id.startsWith("item_proc_bomb_")) return "bomb";
  if (id.startsWith("item_fbottle_") || id.startsWith("item_gasjar_")) {
    return "filled";
  }
  if (id.endsWith("_cmpt")) return "component";
  if (id.includes("_seed_") || id.endsWith("_seed")) return "seed";
  if (id.includes("_powder")) return "powder";
  if (id.startsWith("item_plant_")) return "plant";

  if (
    id.endsWith("_ore") ||
    id === "item_quartz_sand" ||
    id === "item_muck_feces_1" ||
    id === "item_plant_tundra_wood"
  ) {
    return "ore";
  }

  if (
    id.endsWith("_bottle") ||
    id.endsWith("_jar") ||
    id === "item_glass_bottle" ||
    id === "item_iron_bottle" ||
    id === "item_copper_bottle" ||
    id === "item_glass_enr_bottle" ||
    id === "item_iron_enr_bottle" ||
    id === "item_copper_enr_bottle"
  ) {
    return "container";
  }

  if (item.isGas) return "gas";
  if (item.isLiquid) return "liquid";

  if (
    id.includes("_nugget") ||
    id.includes("_enr") ||
    id.endsWith("_mtl") ||
    id === "item_crystal_shell" ||
    id === "item_quartz_glass" ||
    id === "item_xiranite_poly" ||
    id === "item_filter_core" ||
    id === "item_muck_xiranite_1"
  ) {
    return "refined";
  }

  return "other";
}

/**
 * Broad, user-facing groups modelled after the category structure commonly
 * used by Endfield item lists. The calculator only carries the factory-related
 * subset of the game's item database, so categories that are not present in
 * this dataset are intentionally not synthesized.
 */
export function getMaterialCategory(item: Item): MaterialCategoryId {
  const subtype = getMaterialSubtype(item);

  if (subtype === "event") return "event";
  if (subtype === "medicine" || subtype === "food" || subtype === "bomb") {
    return "consumable";
  }
  if (subtype === "plant" || subtype === "seed") return "gathered";

  if (
    subtype === "ore" ||
    item.id === "item_liquid_water" ||
    item.id === "item_liquid_acid" ||
    item.id === "item_gas_inert"
  ) {
    return "natural";
  }

  if (
    subtype === "powder" ||
    subtype === "refined" ||
    subtype === "liquid" ||
    subtype === "gas" ||
    subtype === "container" ||
    subtype === "filled" ||
    subtype === "component" ||
    subtype === "battery" ||
    subtype === "equipment"
  ) {
    return "industrial";
  }

  return "other";
}


export function getMaterialGroup(item: Item): MaterialGroupId {
  const category = getMaterialCategory(item);
  const subtype = getMaterialSubtype(item);

  if (category === "natural") {
    if (item.isLiquid || subtype === "liquid") return "rawLiquid";
    if (item.isGas || subtype === "gas") return "rawGas";
    return "rawOre";
  }

  if (category === "gathered") {
    return subtype === "seed" ? "seed" : "plant";
  }

  if (category === "industrial") {
    if (subtype === "powder") return "powder";
    if (subtype === "refined") return "refined";
    if (subtype === "liquid") return "industrialLiquid";
    if (subtype === "gas") return "industrialGas";
    if (subtype === "container") return "container";
    if (subtype === "filled") return "filledContainer";
    if (subtype === "component") return "component";
    if (subtype === "battery") return "battery";
    if (subtype === "equipment") return "equipment";
    return "other";
  }

  if (category === "consumable") {
    if (subtype === "medicine") return "medicine";
    if (subtype === "food") return "food";
    if (subtype === "bomb") return "bomb";
  }

  if (category === "event") return "event";
  return "other";
}

export function isPackagingItem(item: Item): boolean {
  const subtype = getMaterialSubtype(item);
  return subtype === "container" || subtype === "filled";
}

