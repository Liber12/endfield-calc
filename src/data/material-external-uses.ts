import type { ItemId } from "@/types";

export type FacilityUse = {
  facility: string;
  amount: number;
};

export type TradeUse = {
  base: string;
  stage: number;
  price: number;
};

export type ExternalItemUse = {
  itemId: ItemId;
  facilityUses?: readonly FacilityUse[];
  tradeUses?: readonly TradeUse[];
};

/**
 * Structured facts extracted from:
 * - Wikiru: 工業製品加工レシピ#Production
 * - Wikiru: 地域建設システム (拠点取引 tables)
 *
 * Last checked: 2026-09-27.
 * Only compact factual relationships are retained here; no article prose/images.
 */
export const externalItemUses: readonly ExternalItemUse[] = [
  {
    itemId: "item_crystal_shell" as ItemId,
    facilityUses: [
      { facility: "携帯式採鉱機", amount: 5 },
      { facility: "電動採鉱機", amount: 5 },
      { facility: "協約貯蔵箱", amount: 10 },
      { facility: "粉砕機", amount: 5 },
      { facility: "組立機", amount: 10 },
      { facility: "成形機", amount: 10 },
      { facility: "装備部品加工機", amount: 10 },
      { facility: "中継タワー", amount: 20 },
      { facility: "発電機", amount: 10 },
      { facility: "医療塔", amount: 20 },
      { facility: "銃器塔", amount: 10 },
    ],
    tradeUses: [{ base: "仮設居住地", stage: 1, price: 1 }],
  },
  {
    itemId: "item_iron_cmpt" as ItemId,
    facilityUses: [
      { facility: "電動採鉱機Ⅱ", amount: 10 },
      { facility: "液体ポンプ", amount: 10 },
      { facility: "液体貯蔵タンク", amount: 10 },
      { facility: "研磨機", amount: 10 },
      { facility: "化学反応炉", amount: 20 },
      { facility: "天有洪炉", amount: 20 },
      { facility: "解体機", amount: 20 },
      { facility: "スプリンクラー", amount: 20 },
      { facility: "排水機", amount: 20 },
      { facility: "強襲銃器塔", amount: 20 },
      { facility: "音波塔", amount: 20 },
    ],
    tradeUses: [{ base: "建設基地", stage: 1, price: 1 }],
  },
  {
    itemId: "item_glass_cmpt" as ItemId,
    facilityUses: [
      { facility: "倉庫搬入口", amount: 20 },
      { facility: "倉庫搬出口", amount: 20 },
      { facility: "採種機", amount: 20 },
      { facility: "栽培機", amount: 20 },
      { facility: "充填機", amount: 20 },
      { facility: "包装機", amount: 20 },
      { facility: "発電機", amount: 10 },
      { facility: "ジップライン", amount: 10 },
      { facility: "伝言ビーコン", amount: 10 },
      { facility: "倉庫中継ボックス", amount: 10 },
      { facility: "榴弾塔", amount: 10 },
      { facility: "液体窒素塔", amount: 20 },
    ],
    tradeUses: [{ base: "仮設居住地", stage: 1, price: 1 }],
  },
  {
    itemId: "item_xiranite_powder" as ItemId,
    facilityUses: [
      { facility: "倉庫連結ハブ部品", amount: 20 },
      { facility: "倉庫連結ハブ基礎", amount: 50 },
      { facility: "息壌送電スタンド", amount: 5 },
      { facility: "息壌中継タワー", amount: 20 },
    ],
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 1, price: 1 },
      { base: "心臓修復施設", stage: 1, price: 1 },
      { base: "満天台建設基地", stage: 1, price: 1 },
    ],
  },
  {
    itemId: "item_originium_ore" as ItemId,
    facilityUses: [
      { facility: "精錬炉", amount: 5 },
      { facility: "送電スタンド", amount: 5 },
    ],
  },
  {
    itemId: "item_carbon_mtl" as ItemId,
    facilityUses: [{ facility: "栽培機", amount: 10 }],
  },
  {
    itemId: "item_glass_enr_cmpt" as ItemId,
    facilityUses: [{ facility: "長距離ジップライン", amount: 10 }],
  },
  {
    itemId: "item_iron_enr_cmpt" as ItemId,
    facilityUses: [
      { facility: "電流塔", amount: 20 },
      { facility: "高火力榴弾塔", amount: 20 },
      { facility: "哨戒塔", amount: 20 },
      { facility: "光線塔", amount: 20 },
      { facility: "毒ガスMK-Ⅰ", amount: 20 },
    ],
    tradeUses: [{ base: "再建管理本部", stage: 1, price: 3 }],
  },
  {
    itemId: "item_glass_bottle" as ItemId,
    tradeUses: [{ base: "仮設居住地", stage: 1, price: 2 }],
  },
  {
    itemId: "item_bottled_rec_hp_1" as ItemId,
    tradeUses: [{ base: "仮設居住地", stage: 1, price: 10 }],
  },
  {
    itemId: "item_bottled_rec_hp_2" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 2, price: 27 },
      { base: "建設基地", stage: 2, price: 27 },
      { base: "再建管理本部", stage: 1, price: 27 },
    ],
  },
  {
    itemId: "item_bottled_rec_hp_3" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 3, price: 70 },
      { base: "建設基地", stage: 3, price: 70 },
      { base: "再建管理本部", stage: 2, price: 70 },
    ],
  },
  {
    itemId: "item_bottled_rec_hp_4" as ItemId,
    tradeUses: [{ base: "天王原建設支援拠点", stage: 1, price: 16 }],
  },
  {
    itemId: "item_bottled_rec_hp_5" as ItemId,
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 3, price: 22 },
      { base: "心臓修復施設", stage: 1, price: 22 },
      { base: "満天台建設基地", stage: 1, price: 22 },
    ],
  },
  {
    itemId: "item_proc_battery_2" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 2, price: 30 },
      { base: "建設基地", stage: 2, price: 30 },
      { base: "再建管理本部", stage: 1, price: 30 },
    ],
  },
  {
    itemId: "item_proc_battery_3" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 3, price: 70 },
      { base: "建設基地", stage: 3, price: 70 },
      { base: "再建管理本部", stage: 2, price: 70 },
    ],
  },
  {
    itemId: "item_proc_battery_4" as ItemId,
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 1, price: 25 },
      { base: "心臓修復施設", stage: 1, price: 25 },
    ],
  },
  {
    itemId: "item_proc_battery_5" as ItemId,
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 3, price: 54 },
      { base: "心臓修復施設", stage: 2, price: 54 },
      { base: "満天台建設基地", stage: 1, price: 54 },
    ],
  },
  {
    itemId: "item_bottled_food_1" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 2, price: 10 },
      { base: "建設基地", stage: 4, price: 10 },
      { base: "再建管理本部", stage: 3, price: 10 },
    ],
  },
  {
    itemId: "item_bottled_food_2" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 3, price: 27 },
      { base: "建設基地", stage: 4, price: 27 },
      { base: "再建管理本部", stage: 3, price: 27 },
    ],
  },
  {
    itemId: "item_bottled_food_3" as ItemId,
    tradeUses: [
      { base: "仮設居住地", stage: 4, price: 70 },
      { base: "建設基地", stage: 4, price: 70 },
      { base: "再建管理本部", stage: 3, price: 70 },
    ],
  },
  {
    itemId: "item_bottled_food_4" as ItemId,
    tradeUses: [{ base: "天王原建設支援拠点", stage: 2, price: 16 }],
  },
  {
    itemId: "item_bottled_food_5" as ItemId,
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 4, price: 22 },
      { base: "心臓修復施設", stage: 1, price: 22 },
      { base: "満天台建設基地", stage: 1, price: 22 },
    ],
  },
  {
    itemId: "item_copper_cmpt" as ItemId,
    tradeUses: [{ base: "天王原建設支援拠点", stage: 3, price: 1 }],
  },
  {
    itemId: "item_copper_enr_cmpt" as ItemId,
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 3, price: 48 },
      { base: "心臓修復施設", stage: 3, price: 48 },
    ],
  },
  {
    itemId: "item_copper_enr2_cmpt" as ItemId,
    tradeUses: [
      { base: "心臓修復施設", stage: 4, price: 70 },
      { base: "満天台建設基地", stage: 1, price: 70 },
    ],
  },
  {
    itemId: "item_xiranite_enr_powder" as ItemId,
    tradeUses: [
      { base: "天王原建設支援拠点", stage: 4, price: 27 },
      { base: "心臓修復施設", stage: 1, price: 27 },
      { base: "満天台建設基地", stage: 1, price: 27 },
    ],
  },
  {
    itemId: "item_filter_core" as ItemId,
    tradeUses: [{ base: "満天台建設基地", stage: 1, price: 1 }],
  },
];

export const externalItemUseById = new Map(
  externalItemUses.map((entry) => [entry.itemId, entry] as const),
);
