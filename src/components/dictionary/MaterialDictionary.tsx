import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ArrowRight,
  BatteryCharging,
  Box,
  Boxes,
  CircleDot,
  Cloud,
  Droplets,
  Eye,
  EyeOff,
  Gem,
  GitBranch,
  HeartPulse,
  Leaf,
  Package,
  Pickaxe,
  Puzzle,
  Search,
  Sparkles,
  Wind,
  Wrench,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getFacilityName,
  getItemName,
  getRecipeName,
} from "@/lib/i18n-helpers";
import {
  buildRecipeIndex,
  recipeEndsOnlyInTerminalPackaging,
} from "@/lib/material-dictionary";
import {
  getMaterialCategory,
  getMaterialSubtype,
  MATERIAL_CATEGORY_ORDER,
  type MaterialCategoryId,
  type MaterialSubtypeId,
} from "@/lib/item-category";
import MaterialUsageGraph from "@/components/dictionary/MaterialUsageGraph";
import type { Facility, Item, ItemId, Recipe } from "@/types";

type MaterialDictionaryProps = {
  items: readonly Item[];
  recipes: readonly Recipe[];
  facilities: readonly Facility[];
};

type DictionaryTab = "uses" | "make" | "tree";
type CategoryFilter = "all" | MaterialCategoryId;

function formatAmount(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(3)));
}

const CATEGORY_ICON: Record<
  MaterialCategoryId,
  ComponentType<{ className?: string }>
> = {
  natural: Pickaxe,
  gathered: Leaf,
  industrial: Wrench,
  consumable: HeartPulse,
  event: Sparkles,
  other: Boxes,
};

const SUBTYPE_ICON: Record<
  MaterialSubtypeId,
  ComponentType<{ className?: string }>
> = {
  ore: Pickaxe,
  plant: Leaf,
  seed: CircleDot,
  powder: Cloud,
  refined: Gem,
  liquid: Droplets,
  gas: Wind,
  container: Box,
  filled: Package,
  component: Puzzle,
  battery: BatteryCharging,
  equipment: Wrench,
  medicine: HeartPulse,
  food: Package,
  bomb: Sparkles,
  event: Sparkles,
  other: Boxes,
};

function categoryLabel(
  t: TFunction<"app">,
  category: MaterialCategoryId,
): string {
  return t(`dictionary.category.${category}`, { defaultValue: category });
}

function subtypeLabel(
  t: TFunction<"app">,
  subtype: MaterialSubtypeId,
): string {
  return t(`dictionary.subtype.${subtype}`, { defaultValue: subtype });
}

function ItemIcon({
  item,
  size = "md",
}: {
  item?: Item;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "sm"
      ? "h-7 w-7"
      : size === "lg"
        ? "h-14 w-14"
        : size === "xl"
          ? "h-16 w-16"
          : "h-11 w-11";

  return item?.iconUrl ? (
    <img
      src={item.iconUrl}
      alt=""
      className={cn(sizeClass, "shrink-0 rounded-md object-contain")}
      loading="lazy"
    />
  ) : (
    <div
      className={cn(sizeClass, "shrink-0 rounded-md bg-muted")}
      aria-hidden="true"
    />
  );
}

function MaterialNode({
  itemId,
  amount,
  itemById,
  onSelect,
  emphasis = false,
}: {
  itemId: ItemId;
  amount?: number;
  itemById: ReadonlyMap<ItemId, Item>;
  onSelect: (itemId: ItemId) => void;
  emphasis?: boolean;
}) {
  const item = itemById.get(itemId);

  return (
    <button
      type="button"
      onClick={() => onSelect(itemId)}
      title={itemId}
      className={cn(
        "group flex w-[112px] shrink-0 flex-col items-center rounded-xl border bg-background p-2.5 text-center transition-colors hover:bg-accent",
        emphasis && "border-primary/60 bg-primary/5",
      )}
    >
      <ItemIcon item={item} size="lg" />
      <span className="mt-1.5 line-clamp-2 text-xs font-semibold leading-tight">
        {item ? getItemName(item) : itemId}
      </span>
      {amount !== undefined && (
        <span className="mt-0.5 text-[11px] text-muted-foreground">
          ×{formatAmount(amount)}
        </span>
      )}
    </button>
  );
}

function MiniMaterialChip({
  itemId,
  amount,
  itemById,
  onSelect,
}: {
  itemId: ItemId;
  amount?: number;
  itemById: ReadonlyMap<ItemId, Item>;
  onSelect: (itemId: ItemId) => void;
}) {
  const item = itemById.get(itemId);

  return (
    <button
      type="button"
      onClick={() => onSelect(itemId)}
      className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 text-left transition-colors hover:bg-accent"
      title={itemId}
    >
      <ItemIcon item={item} size="sm" />
      <span className="text-xs font-medium">
        {item ? getItemName(item) : itemId}
      </span>
      {amount !== undefined && (
        <span className="text-[11px] text-muted-foreground">
          ×{formatAmount(amount)}
        </span>
      )}
    </button>
  );
}

function DirectUseCard({
  recipe,
  selectedItemId,
  itemById,
  facilityById,
  onSelectItem,
}: {
  recipe: Recipe;
  selectedItemId: ItemId;
  itemById: ReadonlyMap<ItemId, Item>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const { t } = useTranslation("app");
  const facility = facilityById.get(recipe.facilityId);
  const selectedAmount = recipe.inputs
    .filter((entry) => entry.itemId === selectedItemId)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const otherInputs = recipe.inputs.filter(
    (entry) => entry.itemId !== selectedItemId,
  );

  return (
    <article className="rounded-2xl border bg-card p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2 border-b pb-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {getRecipeName(recipe)}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
            {recipe.craftingTime}s
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2">
          <MaterialNode
            itemId={selectedItemId}
            amount={selectedAmount || undefined}
            itemById={itemById}
            onSelect={onSelectItem}
            emphasis
          />

          {otherInputs.map((entry, index) => (
            <div
              key={`${entry.itemId}-${index}`}
              className="flex shrink-0 items-center gap-2"
            >
              <span className="text-xl font-semibold text-muted-foreground">
                +
              </span>
              <MaterialNode
                itemId={entry.itemId}
                amount={entry.amount}
                itemById={itemById}
                onSelect={onSelectItem}
              />
            </div>
          ))}

          <ArrowRight className="mx-1 h-7 w-7 shrink-0 text-muted-foreground" />

          {recipe.outputs.map((entry, index) => (
            <MaterialNode
              key={`${entry.itemId}-${index}`}
              itemId={entry.itemId}
              amount={entry.amount}
              itemById={itemById}
              onSelect={onSelectItem}
            />
          ))}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("dictionary.combineHint", {
          defaultValue: "Selected material + required inputs → output",
        })}
      </p>
    </article>
  );
}

function RecipeCard({
  recipe,
  itemById,
  facilityById,
  onSelectItem,
}: {
  recipe: Recipe;
  itemById: ReadonlyMap<ItemId, Item>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const { t } = useTranslation("app");
  const facility = facilityById.get(recipe.facilityId);

  return (
    <article className="rounded-2xl border bg-card p-3 shadow-xs">
      <div>
        <div className="font-medium">{getRecipeName(recipe)}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
          {recipe.craftingTime}s
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("dictionary.inputs", { defaultValue: "Inputs" })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recipe.inputs.length > 0 ? (
              recipe.inputs.map((entry, index) => (
                <MiniMaterialChip
                  key={`${entry.itemId}-${index}`}
                  itemId={entry.itemId}
                  amount={entry.amount}
                  itemById={itemById}
                  onSelect={onSelectItem}
                />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <ArrowRight className="hidden h-5 w-5 text-muted-foreground lg:block" />

        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t("dictionary.outputs", { defaultValue: "Produces" })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recipe.outputs.length > 0 ? (
              recipe.outputs.map((entry, index) => (
                <MiniMaterialChip
                  key={`${entry.itemId}-${index}`}
                  itemId={entry.itemId}
                  amount={entry.amount}
                  itemById={itemById}
                  onSelect={onSelectItem}
                />
              ))
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MaterialDictionary({
  items,
  recipes,
  facilities,
}: MaterialDictionaryProps) {
  const { t, i18n } = useTranslation("app");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [activeTab, setActiveTab] = useState<DictionaryTab>("uses");
  const [hideTerminalPackaging, setHideTerminalPackaging] = useState(true);
  const detailRef = useRef<HTMLDivElement>(null);

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item] as const)),
    [items],
  );
  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe] as const)),
    [recipes],
  );
  const facilityById = useMemo(
    () =>
      new Map(facilities.map((facility) => [facility.id, facility] as const)),
    [facilities],
  );
  const index = useMemo(() => buildRecipeIndex(recipes), [recipes]);

  const categoryCounts = useMemo(() => {
    const out = new Map<MaterialCategoryId, number>();
    for (const item of items) {
      const category = getMaterialCategory(item);
      out.set(category, (out.get(category) ?? 0) + 1);
    }
    return out;
  }, [items]);

  const [selectedId, setSelectedId] = useState<ItemId | null>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(
      "item",
    ) as ItemId | null;
    return fromUrl && items.some((item) => item.id === fromUrl)
      ? fromUrl
      : null;
  });

  const selectItem = useCallback(
    (itemId: ItemId) => {
      if (!itemById.has(itemId)) return;
      setSelectedId(itemId);
      setActiveTab("uses");

      const url = new URL(window.location.href);
      url.searchParams.set("view", "dictionary");
      url.searchParams.set("item", itemId);
      window.history.replaceState(null, "", url.toString());

      requestAnimationFrame(() => {
        detailRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    [itemById],
  );

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(i18n.language);

    return [...items]
      .filter((item) => {
        if (
          categoryFilter !== "all" &&
          getMaterialCategory(item) !== categoryFilter
        ) {
          return false;
        }

        if (!normalized) return true;

        const name = getItemName(item).toLocaleLowerCase(i18n.language);
        return (
          name.includes(normalized) ||
          item.id.toLocaleLowerCase().includes(normalized)
        );
      })
      .sort((a, b) =>
        getItemName(a).localeCompare(getItemName(b), i18n.language, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [items, query, categoryFilter, i18n.language]);

  const selectedItem = selectedId ? itemById.get(selectedId) : undefined;
  const selectedCategory = selectedItem
    ? getMaterialCategory(selectedItem)
    : undefined;
  const selectedSubtype = selectedItem
    ? getMaterialSubtype(selectedItem)
    : undefined;
  const producers = selectedId ? index.producedBy.get(selectedId) ?? [] : [];
  const allUses = selectedId ? index.usedBy.get(selectedId) ?? [] : [];
  const visibleUses = useMemo(
    () =>
      hideTerminalPackaging
        ? allUses.filter(
            (recipe) =>
              !recipeEndsOnlyInTerminalPackaging(recipe, itemById, index),
          )
        : allUses,
    [allUses, hideTerminalPackaging, itemById, index],
  );
  const hiddenPackagingUses = allUses.length - visibleUses.length;

  return (
    <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(330px,390px)_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-xl border bg-card">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 pl-9"
              placeholder={t("dictionary.search", {
                defaultValue: "Search materials",
              })}
              aria-label={t("dictionary.search", {
                defaultValue: "Search materials",
              })}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left",
                categoryFilter === "all"
                  ? "border-primary bg-primary/10"
                  : "bg-background hover:bg-accent",
              )}
            >
              <Boxes className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {t("dictionary.category.all", { defaultValue: "All" })}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {items.length}
              </span>
            </button>

            {MATERIAL_CATEGORY_ORDER.map((category) => {
              const count = categoryCounts.get(category) ?? 0;
              if (count === 0) return null;
              const Icon = CATEGORY_ICON[category];

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left",
                    categoryFilter === category
                      ? "border-primary bg-primary/10"
                      : "bg-background hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {categoryLabel(t, category)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {t("dictionary.resultCount", {
              count: filteredItems.length,
              defaultValue: "{{count}} items",
            })}
          </div>
        </div>

        <div className="max-h-[42vh] overflow-y-auto p-2 md:max-h-none md:flex-1">
          <div className="grid grid-cols-3 gap-1.5">
            {filteredItems.map((item) => {
              const active = item.id === selectedId;
              const useCount = index.usedBy.get(item.id)?.length ?? 0;
              const subtype = getMaterialSubtype(item);
              const Icon = SUBTYPE_ICON[subtype];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectItem(item.id)}
                  className={cn(
                    "relative flex min-h-[112px] flex-col items-center rounded-xl border p-2 text-center transition-colors",
                    active
                      ? "border-primary bg-primary/8"
                      : "bg-background hover:bg-accent",
                  )}
                  title={item.id}
                >
                  <ItemIcon item={item} size="lg" />
                  <span className="mt-1.5 line-clamp-2 text-xs font-semibold leading-tight">
                    {getItemName(item)}
                  </span>
                  <span className="mt-auto flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {subtypeLabel(t, subtype)}
                  </span>
                  {useCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {useCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div
        ref={detailRef}
        className="min-h-0 overflow-y-auto rounded-xl border bg-background"
      >
        {!selectedItem ? (
          <div className="flex h-full min-h-52 items-center justify-center p-6 text-center">
            <div>
              <GitBranch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                {t("dictionary.selectPrompt", {
                  defaultValue:
                    "Select a material to see how it is made and where it is used.",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-full">
            <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-5">
              <div className="flex flex-wrap items-center gap-3">
                <ItemIcon item={selectedItem} size="xl" />

                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold">
                    {getItemName(selectedItem)}
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {selectedCategory &&
                      (() => {
                        const Icon = CATEGORY_ICON[selectedCategory];
                        return (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                            {categoryLabel(t, selectedCategory)}
                          </span>
                        );
                      })()}

                    {selectedSubtype && (
                      <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {subtypeLabel(t, selectedSubtype)}
                      </span>
                    )}

                    <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                      T{selectedItem.tier}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="rounded-xl border px-3 py-2 text-center">
                    <div className="text-xl font-semibold">
                      {visibleUses.length}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("dictionary.directUses", {
                        defaultValue: "Direct uses",
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border px-3 py-2 text-center">
                    <div className="text-xl font-semibold">
                      {producers.length}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("dictionary.madeBy", {
                        defaultValue: "Ways to make",
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as DictionaryTab)
                  }
                  className="gap-0"
                >
                  <TabsList className="grid h-11 w-full grid-cols-3 md:w-auto">
                    <TabsTrigger value="uses">
                      <Workflow className="h-4 w-4" />
                      {t("dictionary.tabUses", { defaultValue: "Uses" })}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        {visibleUses.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="make">
                      <Wrench className="h-4 w-4" />
                      {t("dictionary.tabMake", {
                        defaultValue: "How to make",
                      })}
                    </TabsTrigger>
                    <TabsTrigger value="tree">
                      <GitBranch className="h-4 w-4" />
                      {t("dictionary.tabMap", {
                        defaultValue: "Usage map",
                      })}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Button
                  type="button"
                  size="sm"
                  variant={hideTerminalPackaging ? "secondary" : "outline"}
                  onClick={() =>
                    setHideTerminalPackaging((value) => !value)
                  }
                >
                  {hideTerminalPackaging ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {t("dictionary.hideTerminalPackaging", {
                    defaultValue: "Hide terminal packaging",
                  })}
                  {hiddenPackagingUses > 0 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {hiddenPackagingUses}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as DictionaryTab)
              }
              className="p-4 md:p-5"
            >
              <TabsContent value="uses" className="mt-0">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.usedFor", { defaultValue: "Direct uses" })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.usedForVisualHint", {
                      defaultValue:
                        "Each row shows what this material must be combined with and what it produces.",
                    })}
                  </p>
                </div>

                {visibleUses.length > 0 ? (
                  <div className="grid gap-3 2xl:grid-cols-2">
                    {visibleUses.map((recipe) => (
                      <DirectUseCard
                        key={recipe.id}
                        recipe={recipe}
                        selectedItemId={selectedItem.id}
                        itemById={itemById}
                        facilityById={facilityById}
                        onSelectItem={selectItem}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {hiddenPackagingUses > 0 && hideTerminalPackaging
                      ? t("dictionary.onlyTerminalPackaging", {
                          count: hiddenPackagingUses,
                          defaultValue:
                            "Only terminal packaging uses are hidden. Turn the filter off to show them.",
                        })
                      : t("dictionary.noUse", {
                          defaultValue: "No recipe consumes this item.",
                        })}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="make" className="mt-0">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.howToMake", {
                      defaultValue: "How to make",
                    })}
                  </h3>
                </div>

                {producers.length > 0 ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {producers.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        itemById={itemById}
                        facilityById={facilityById}
                        onSelectItem={selectItem}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t("dictionary.noProducer", {
                      defaultValue:
                        "No production recipe is registered for this item.",
                    })}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="tree" className="mt-0">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.usageMap", {
                      defaultValue: "Usage map",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.usageMapHint", {
                      defaultValue:
                        "Materials are de-duplicated. Pan and zoom to follow the downstream graph; recipe cards show required co-inputs.",
                    })}
                  </p>
                </div>

                <MaterialUsageGraph
                  rootItemId={selectedItem.id}
                  index={index}
                  itemById={itemById}
                  recipeById={recipeById}
                  hideTerminalPackaging={hideTerminalPackaging}
                  onSelectItem={selectItem}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </section>
  );
}
