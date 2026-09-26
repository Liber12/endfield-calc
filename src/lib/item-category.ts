import type { Item } from "@/types";

export type MaterialCategoryId =
  | "raw"
  | "plant"
  | "seed"
  | "powder"
  | "refined"
  | "liquid"
  | "gas"
  | "container"
  | "filled"
  | "component"
  | "consumable"
  | "battery"
  | "equipment"
  | "event"
  | "other";

export const MATERIAL_CATEGORY_ORDER: readonly MaterialCategoryId[] = [
  "raw",
  "plant",
  "seed",
  "powder",
  "refined",
  "liquid",
  "gas",
  "container",
  "filled",
  "component",
  "consumable",
  "battery",
  "equipment",
  "event",
  "other",
];

export function getMaterialCategory(item: Item): MaterialCategoryId {
  const id = item.id;

  if (id.startsWith("item_activity_")) return "event";
  if (id.startsWith("item_proc_battery_")) return "battery";
  if (id.startsWith("item_equip_script_")) return "equipment";
  if (
    id.startsWith("item_bottled_") ||
    id.startsWith("item_proc_bomb_")
  ) {
    return "consumable";
  }

  if (item.isGas) return "gas";
  if (item.isLiquid) return "liquid";

  if (
    id.startsWith("item_fbottle_") ||
    id.startsWith("item_gasjar_")
  ) {
    return "filled";
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
    return "raw";
  }

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
