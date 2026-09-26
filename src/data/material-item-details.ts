import type { ItemId } from "@/types";

export type MaterialItemDetail = {
  kind: "description" | "effect";
  text: string;
  sourcePage: string;
};

/**
 * Compact functional item text extracted from Wikiru item tables.
 * Flavor/lore columns are intentionally not copied.
 * Last generated: 2026-09-27.
 */
export const materialItemDetails: Readonly<Record<string, MaterialItemDetail>> = {
  "item_originium_ore": {
    "kind": "description",
    "text": "最も粗い状態で採掘された源石。集成工業システムで加工できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_quartz_sand": {
    "kind": "description",
    "text": "紫色の結晶が内包されている岩石。集成工業システムで加工できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_ore": {
    "kind": "description",
    "text": "自然に存在する青色の合金。集成工業システムで加工できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_ore": {
    "kind": "description",
    "text": "赤い金属。集成工業システムで加工できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_1": {
    "kind": "description",
    "text": "野外採集や工場栽培で入手できる色鮮やかな花。粉砕すれば、薬や素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_seed_1": {
    "kind": "description",
    "text": "蕎花の種。蕎花の栽培に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_2": {
    "kind": "description",
    "text": "野外採集や工場栽培で入手できる果物。粉砕すれば、食品や素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_seed_2": {
    "kind": "description",
    "text": "シトロームの種。シトロームの栽培に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_3": {
    "kind": "description",
    "text": "野外採集や工場栽培で入手できるザラザラした葉を持つ植物。粉砕すれば、精密な研磨に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_seed_3": {
    "kind": "description",
    "text": "サンドリーフの種。サンドリーフの栽培に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_bbflower_1": {
    "kind": "description",
    "text": "野外採集や工場栽培で入手できる植物。可燃性と爆発性の成分を含む。主に工業爆弾の製造に使用される。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_bbflower_seed_1": {
    "kind": "description",
    "text": "アケトン樹木の種。アケトン樹木の栽培に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_grass_1": {
    "kind": "description",
    "text": "野外採集や工場栽培で入手できる植物。粉砕すれば、食品や素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_grass_seed_1": {
    "kind": "description",
    "text": "錦草の種。採種によって入手でき、大量の水を使用すれば錦草を育てることができる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_grass_2": {
    "kind": "description",
    "text": "野外採集や工場栽培で入手できる花。粉砕すれば、薬や素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_grass_seed_2": {
    "kind": "description",
    "text": "芽針の種。採種で入手でき、大量の水を使用すれば芽針を育てることができる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_tundra_wood": {
    "kind": "description",
    "text": "野外で採集できる普通の木材。素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_water": {
    "kind": "description",
    "text": "きれいな水。集成工業システムにおいて、さまざまな用途がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_acid": {
    "kind": "description",
    "text": "溶解しづらい一部の素材を分解でき、集成工業システムにおいて、幅広く活用されている。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_inert": {
    "kind": "description",
    "text": "性質の安定したガス。\n集成工業システムにおいて、さまざまな用途がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_xiranite": {
    "kind": "description",
    "text": "息壌のガス状態。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_1": {
    "kind": "description",
    "text": "手間ひまかけた栽培でようやく育つ作物。貴重な食品·薬の製作に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_2": {
    "kind": "description",
    "text": "手間ひまかけた栽培でようやく育つ作物。貴重な食品·薬の製作に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_3": {
    "kind": "description",
    "text": "手間ひまかけた栽培でようやく育つ作物。貴重な食品·薬の製作に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_4": {
    "kind": "description",
    "text": "手間ひまかけた栽培でようやく育つ作物。貴重な食品·薬の製作に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_seed_1": {
    "kind": "description",
    "text": "野生の灰麦の種。畑に入れて丁寧に育てると、灰麦が収穫できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_seed_2": {
    "kind": "description",
    "text": "野生の苦葉椒の種。畑に入れて丁寧に育てると、苦葉椒が収穫できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_seed_3": {
    "kind": "description",
    "text": "野生の玉葉人参の種。畑に入れて丁寧に育てると、玉葉人参が収穫できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_sp_seed_4": {
    "kind": "description",
    "text": "野生の金石稲の種。畑に入れて丁寧に育てると、金石稲が収穫できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_muck_feces_1": {
    "kind": "description",
    "text": "駄獣の糞便。\n成長期の畑で肥料として使用すると、畑の成長期を短縮させる効果がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_plant_grass_1": {
    "kind": "description",
    "text": "錦草のエキス。\n加工合成することで、薬として使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_plant_grass_2": {
    "kind": "description",
    "text": "芽針のエキス。\n加工合成することで、薬として使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_xiranite": {
    "kind": "description",
    "text": "水に溶かして作られた息壌。\n素材の合成に使用できる。\n武陵で噴射ドローンによる動的侵蝕の排除によく用いられる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_xiranite_enr": {
    "kind": "description",
    "text": "沈殿酸に溶かして作られた重息壌。\n素材の合成に使用できる。\n武陵で噴射ドローンによる動的侵蝕の排除によく用いられる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_xiranite_poly": {
    "kind": "description",
    "text": "液化息壌が汚水と反応した際に生成される溶液。\n素材の合成に使用できるほか、廃水処理機で無害化処理を行うことも可能である。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_xiranite_lowpoly": {
    "kind": "description",
    "text": "液化息壌が汚水と反応した際に生成される副産物。\n廃水処理機で無害化処理をする必要がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_copper": {
    "kind": "description",
    "text": "沈殿酸に溶かして作られた溶液。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_copper_enr": {
    "kind": "description",
    "text": "赤銅溶液を精製して作られた溶液。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_liquid_sewage": {
    "kind": "description",
    "text": "複雑な成分が混じっている汚水。\n廃水処理機で無害化処理をする必要がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_water": {
    "kind": "description",
    "text": "水のガス状態。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_acid": {
    "kind": "description",
    "text": "沈殿酸のガス状態。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_xiranite_enr": {
    "kind": "description",
    "text": "重息壌のガス状態。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_copper": {
    "kind": "description",
    "text": "赤銅のガス状態。\n廃水処理機で無害化処理をする必要がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_copper_enr": {
    "kind": "description",
    "text": "緋銅のガス状態。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_gas_copper_enr2": {
    "kind": "description",
    "text": "焔銅のガス状態。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_carbon_mtl": {
    "kind": "description",
    "text": "植物を焼成して作られた炭素材。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_crystal_shell": {
    "kind": "description",
    "text": "源石を加工する際に剥がれた外殻の部分。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_quartz_glass": {
    "kind": "description",
    "text": "紫晶鉱物を精錬加工して作られた繊維。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_nugget": {
    "kind": "description",
    "text": "青鉄鉱物を精錬加工して作られた金属塊。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_nugget": {
    "kind": "description",
    "text": "赤銅鉱物を精錬加工して作られた金属塊。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_carbon_enr": {
    "kind": "description",
    "text": "高密度炭塊粉末を精錬、融合して作られた高級な素材。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_crystal_enr": {
    "kind": "description",
    "text": "高密度結晶粉末を精錬、融合して作られた高級な素材。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_quartz_enr": {
    "kind": "description",
    "text": "高晶粉末を精錬、融合して作られた高級な素材。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_enr": {
    "kind": "description",
    "text": "高密度青鉄粉末を精錬、融合して作られた高級な素材。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_enr": {
    "kind": "description",
    "text": "反応によって得られる緋銅塊の沈殿物。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_enr2": {
    "kind": "description",
    "text": "焔銅ガスをガス固体転換機によって固体化した塊。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_muck_xiranite_1": {
    "kind": "description",
    "text": "駄獣のフンと液化息壌の複合肥料。\n成長期の畑で肥料として使用すると、畑を増産させる効果がある。",
    "sourcePage": "アイテム一覧"
  },
  "item_xiranite_powder": {
    "kind": "description",
    "text": "特殊設備で獲得できる素材。\n特殊装置の修理や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_xiranite_enr_powder": {
    "kind": "description",
    "text": "特殊設備で獲得できる素材。\n特殊装置の修理や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_xiranite_poly": {
    "kind": "description",
    "text": "反応によって得られる結晶の沈殿物。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_carbon_powder": {
    "kind": "description",
    "text": "炭を素材とした粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_originium_powder": {
    "kind": "description",
    "text": "安定状態の源石粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_crystal_powder": {
    "kind": "description",
    "text": "結晶外殻を素材とした粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_quartz_powder": {
    "kind": "description",
    "text": "紫晶繊維を粉砕して作られた粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_powder": {
    "kind": "description",
    "text": "青鉄塊を粉砕して作られた粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_powder": {
    "kind": "description",
    "text": "赤銅塊を粉砕して作られた粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_powder_3": {
    "kind": "description",
    "text": "サンドリーフ粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_bbflower_powder_1": {
    "kind": "description",
    "text": "アケトン粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_enr_powder_1": {
    "kind": "description",
    "text": "蕎花粉末を研磨して作られた細粉。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_plant_moss_enr_powder_2": {
    "kind": "description",
    "text": "シトローム粉末を研磨して作られた細粉。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_carbon_enr_powder": {
    "kind": "description",
    "text": "炭塊粉末を研磨して作られた高密度粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_originium_enr_powder": {
    "kind": "description",
    "text": "源石粉末を研磨して作られた高密度粉末。\n状態は安定しており、素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_crystal_enr_powder": {
    "kind": "description",
    "text": "結晶外殻粉末を研磨して作られた高密度粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_quartz_enr_powder": {
    "kind": "description",
    "text": "紫晶粉末を研磨して作られた高密度粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_enr_powder": {
    "kind": "description",
    "text": "青鉄粉末を研磨して作られた高密度粉末。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_glass_bottle": {
    "kind": "description",
    "text": "紫晶繊維を加工して作られたボトル。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_bottle": {
    "kind": "description",
    "text": "青鉄塊を加工して作られた金属のボトル。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_glass_enr_bottle": {
    "kind": "description",
    "text": "高晶繊維を加工して作られた金属のボトル。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_enr_bottle": {
    "kind": "description",
    "text": "鋼塊を加工して作られた金属のボトル。\n素材の合成に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_bottle": {
    "kind": "description",
    "text": "赤銅塊を加工して作られた金属のボトル。\n素材の合成に使用できる。液体充填によく用いられる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_enr_bottle": {
    "kind": "description",
    "text": "緋銅塊を加工して作られた金属のボトル。\n素材の合成に使用できる。液体充填によく用いられる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_jar": {
    "kind": "description",
    "text": "赤銅塊を加工して作られた圧カタンク。\n素材の合成に使用できる。ガス充填によく用いられる。",
    "sourcePage": "アイテム一覧"
  },
  "item_glass_cmpt": {
    "kind": "description",
    "text": "紫晶繊維を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_cmpt": {
    "kind": "description",
    "text": "青鉄を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_glass_enr_cmpt": {
    "kind": "description",
    "text": "高晶繊維を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_iron_enr_cmpt": {
    "kind": "description",
    "text": "鋼塊を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_cmpt": {
    "kind": "description",
    "text": "赤銅塊を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_enr_cmpt": {
    "kind": "description",
    "text": "緋銅塊を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_copper_enr2_cmpt": {
    "kind": "description",
    "text": "焔銅塊を加工して作られた部品。\n素材の合成や設備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_1": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_2": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_3": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_4": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_4_1": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_4_2": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_equip_script_4_3": {
    "kind": "description",
    "text": "複数の素材を加工して得られる装備部品。\n装備の製造に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_proc_battery_1": {
    "kind": "description",
    "text": "包装機で獲得できるバッテリー。\n発電、設備のエネルギー充電や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_proc_battery_2": {
    "kind": "description",
    "text": "包装機で獲得できるバッテリー。\n発電、設備のエネルギー充電や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_proc_battery_3": {
    "kind": "description",
    "text": "包装機で獲得できるバッテリー。\n発電、設備のエネルギー充電や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_proc_battery_4": {
    "kind": "description",
    "text": "包装機で獲得できるバッテリー。\n発電、設備のエネルギー充電や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_proc_battery_5": {
    "kind": "description",
    "text": "包装機で獲得できるバッテリー。\n発電、設備のエネルギー充電や拠点での取引に用いる。",
    "sourcePage": "アイテム一覧"
  },
  "item_filter_core": {
    "kind": "description",
    "text": "ろ過装置。\nガス素材の精製に使用できる。",
    "sourcePage": "アイテム一覧"
  },
  "item_proc_bomb_1": {
    "kind": "effect",
    "text": "組み立てられた爆発物。\n使用すると、爆発時に周囲のすべての敵にダメージを与える。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_plant_moss_powder_1": {
    "kind": "effect",
    "text": "使用すると、HPを352回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_plant_moss_powder_2": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒HPを88回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_plant_grass_powder_1": {
    "kind": "effect",
    "text": "使用すると、HPを874回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_plant_grass_powder_2": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒最大HPを218回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_rec_hp_1": {
    "kind": "effect",
    "text": "使用すると、HPを470回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_rec_hp_2": {
    "kind": "effect",
    "text": "使用すると、HPを655回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_food_1": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒HPを117回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_food_2": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒HPを164回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_food_4": {
    "kind": "effect",
    "text": "使用すると、HPを1278回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_rec_hp_4": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒HPを320回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_rec_hp_3": {
    "kind": "effect",
    "text": "使用すると、HPを891回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_food_3": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒HPを223回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_food_5": {
    "kind": "effect",
    "text": "使用すると、HPを1564回復する。",
    "sourcePage": "テーブル/消費アイテム"
  },
  "item_bottled_rec_hp_5": {
    "kind": "effect",
    "text": "使用すると、6秒間、毎秒HPを391回復する。",
    "sourcePage": "テーブル/消費アイテム"
  }
};

export function getMaterialItemDetail(itemId: ItemId): MaterialItemDetail | undefined {
  return materialItemDetails[itemId];
}
