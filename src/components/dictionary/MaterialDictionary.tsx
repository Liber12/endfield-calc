import { useCallback, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ArrowDown,
  ArrowRight,
  BatteryCharging,
  Box,
  Boxes,
  Building2,
  ChevronDown,
  CircleDot,
  Cloud,
  Droplets,
  Factory,
  Gem,
  GitBranch,
  HeartPulse,
  Info,
  Leaf,
  Package,
  Pickaxe,
  Puzzle,
  Route,
  Search,
  Star,
  Store,
  Wrench,
  Workflow,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  getFacilityName,
  getItemName,
  getRecipeName,
} from "@/lib/i18n-helpers";
import {
  buildRecipeIndex,
  buildRequirementTree,
} from "@/lib/material-dictionary";
import type { RequirementTreeNode as RequirementNode } from "@/lib/material-dictionary";
import {
  findShortestMaterialRoute,
  getItemUseSummary,
  getMeaningfulDirectUses,
  getUsefulEndpoints,
  type MaterialRouteStep,
  type UsefulEndpoint,
  type UsefulEndpointKind,
} from "@/lib/material-use-routes";
import {
  getMaterialCategory,
  getMaterialGroup,
  getMaterialSubtype,
  MATERIAL_CATEGORY_ORDER,
  MATERIAL_GROUP_ORDER,
  type MaterialCategoryId,
  type MaterialGroupId,
  type MaterialSubtypeId,
} from "@/lib/item-category";
import { externalItemUseById } from "@/data/material-external-uses";
import { getMaterialItemDetail } from "@/data/material-item-details";
import type { Facility, Item, ItemId, Recipe } from "@/types";

type MaterialDictionaryProps = {
  items: readonly Item[];
  recipes: readonly Recipe[];
  facilities: readonly Facility[];
};

type CategoryFilter = "all" | MaterialCategoryId;
type EndpointFilter = "all" | UsefulEndpointKind;
type MainView = "production" | "uses";

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
  event: Package,
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
  gas: Cloud,
  container: Box,
  filled: Package,
  component: Puzzle,
  battery: BatteryCharging,
  equipment: Wrench,
  medicine: HeartPulse,
  food: Package,
  bomb: Package,
  event: Package,
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

function groupLabel(
  t: TFunction<"app">,
  group: MaterialGroupId,
): string {
  return t(`dictionary.group.${group}`, { defaultValue: group });
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
      ? "h-9 w-9"
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

function MiniMaterialChip({
  itemId,
  amount,
  itemById,
  onSelect,
  prominent = false,
}: {
  itemId: ItemId;
  amount?: number;
  itemById: ReadonlyMap<ItemId, Item>;
  onSelect: (itemId: ItemId) => void;
  prominent?: boolean;
}) {
  const item = itemById.get(itemId);

  return (
    <button
      type="button"
      onClick={() => onSelect(itemId)}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border bg-background text-left transition-colors hover:bg-accent",
        prominent
          ? "min-h-14 px-3 py-2"
          : "min-h-10 px-2 py-1.5",
      )}
      title={itemId}
    >
      <ItemIcon item={item} size="sm" />
      <span className={cn("font-medium", prominent ? "text-sm" : "text-xs")}>
        {item ? getItemName(item) : itemId}
      </span>
      {amount !== undefined && (
        <span className="text-xs text-muted-foreground">
          ×{formatAmount(amount)}
        </span>
      )}
    </button>
  );
}

function MaterialPicker({
  open,
  onOpenChange,
  items,
  selectedId,
  query,
  onQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryCounts,
  itemById,
  index,
  onSelectItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly Item[];
  selectedId: ItemId | null;
  query: string;
  onQueryChange: (value: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (value: CategoryFilter) => void;
  categoryCounts: ReadonlyMap<MaterialCategoryId, number>;
  itemById: ReadonlyMap<ItemId, Item>;
  index: ReturnType<typeof buildRecipeIndex>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const { t, i18n } = useTranslation("app");

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

  const groupedItems = useMemo(
    () =>
      MATERIAL_GROUP_ORDER.map((group) => ({
        group,
        items: filteredItems.filter((item) => getMaterialGroup(item) === group),
      })).filter((entry) => entry.items.length > 0),
    [filteredItems],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="endfield-picker w-[94vw] gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="endfield-picker-header border-b pr-12">
          <SheetTitle>
            {t("dictionary.chooseMaterial", {
              defaultValue: "Choose starting material",
            })}
          </SheetTitle>
          <SheetDescription>
            {t("dictionary.chooseMaterialHint", {
              defaultValue:
                "Pick the material whose direct uses and production routes you want to inspect.",
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="endfield-search-input h-11 pl-9"
              placeholder={t("dictionary.search", {
                defaultValue: "Search materials",
              })}
            />
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onCategoryFilterChange("all")}
              className={cn(
                "endfield-filter-pill inline-flex shrink-0 items-center gap-2 border px-3 py-2 text-sm",
                categoryFilter === "all"
                  ? "is-active border-primary bg-primary/10"
                  : "bg-background hover:bg-accent",
              )}
            >
              <Boxes className="h-4 w-4" />
              {t("dictionary.category.all", { defaultValue: "All" })}
              <span className="text-xs text-muted-foreground">
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
                  onClick={() => onCategoryFilterChange(category)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    categoryFilter === category
                      ? "is-active border-primary bg-primary/10"
                      : "bg-background hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {categoryLabel(t, category)}
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {groupedItems.map(({ group, items: groupItems }) => (
              <section key={group}>
                <div className="endfield-group-heading mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em]">
                    {groupLabel(t, group)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {groupItems.length}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {groupItems.map((item) => {
                    const active = item.id === selectedId;
                    const subtype = getMaterialSubtype(item);
                    const Icon = SUBTYPE_ICON[subtype];
                    const useCount = getMeaningfulDirectUses(
                      item.id,
                      index,
                      itemById,
                    ).length;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectItem(item.id);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "endfield-item-card relative flex min-h-[132px] flex-col items-center border p-3 text-center transition-colors",
                          active
                            ? "is-active border-primary bg-primary/10"
                            : "bg-background hover:bg-accent",
                        )}
                        title={item.id}
                      >
                        <ItemIcon item={item} size="lg" />
                        <span className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
                          {getItemName(item)}
                        </span>
                        <span className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-muted-foreground">
                          <Icon className="h-3 w-3" />
                          {subtypeLabel(t, subtype)}
                        </span>
                        {useCount > 0 && (
                          <span className="absolute right-2 top-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                            {useCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EndpointChoice({
  endpoint,
  itemById,
  selected,
  onSelect,
}: {
  endpoint: UsefulEndpoint;
  itemById: ReadonlyMap<ItemId, Item>;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("app");
  const item = itemById.get(endpoint.targetItemId);
  const uniqueBases = new Set(endpoint.tradeUses?.map((use) => use.base) ?? []);
  const facilityCount = endpoint.facilityUses?.length ?? 0;

  const meta =
    endpoint.kind === "product"
      ? t("dictionary.endpointProduct", { defaultValue: "Product" })
      : endpoint.kind === "trade"
        ? t("dictionary.endpointTradeCount", {
            count: uniqueBases.size,
            defaultValue: "{{count}} trade locations",
          })
        : t("dictionary.endpointFacilityCount", {
            count: facilityCount,
            defaultValue: "{{count}} facilities",
          });

  const Icon =
    endpoint.kind === "product"
      ? Package
      : endpoint.kind === "trade"
        ? Store
        : Factory;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "endfield-endpoint-card flex w-full items-center gap-2 border p-2.5 text-left transition-colors",
        selected
          ? "is-active border-primary bg-primary/10"
          : "bg-background hover:bg-accent",
      )}
    >
      <ItemIcon item={item} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">
          {item ? getItemName(item) : endpoint.targetItemId}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
          <Icon className="h-3 w-3 shrink-0" />
          {meta}
        </span>
      </span>
    </button>
  );
}

function DirectUseLane({
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
  const coInputs = recipe.inputs.filter(
    (entry) => entry.itemId !== selectedItemId,
  );

  return (
    <article className="endfield-direct-lane border bg-card p-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="min-w-[150px]">
          <div className="text-sm font-semibold">{getRecipeName(recipe)}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
            {recipe.craftingTime}s
          </div>
        </div>

        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />

        <div className="flex flex-1 flex-wrap gap-1.5">
          {recipe.outputs.map((entry, index) => (
            <MiniMaterialChip
              key={`${entry.itemId}-${index}`}
              itemId={entry.itemId}
              amount={entry.amount}
              itemById={itemById}
              onSelect={onSelectItem}
              prominent
            />
          ))}
        </div>
      </div>

      {coInputs.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t("dictionary.alsoRequires", {
              defaultValue: "Also requires",
            })}
          </span>
          {coInputs.map((entry, index) => (
            <MiniMaterialChip
              key={`${entry.itemId}-${index}`}
              itemId={entry.itemId}
              amount={entry.amount}
              itemById={itemById}
              onSelect={onSelectItem}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function RouteMaterial({
  itemId,
  itemById,
  onSelectItem,
  emphasis = false,
}: {
  itemId: ItemId;
  itemById: ReadonlyMap<ItemId, Item>;
  onSelectItem: (itemId: ItemId) => void;
  emphasis?: boolean;
}) {
  const item = itemById.get(itemId);

  return (
    <button
      type="button"
      onClick={() => onSelectItem(itemId)}
      className={cn(
        "endfield-route-material flex w-full flex-col items-center border bg-card p-3 text-center md:w-[128px] md:shrink-0",
        emphasis && "is-emphasis border-primary bg-primary/5",
      )}
    >
      <ItemIcon item={item} size="lg" />
      <span className="mt-1 line-clamp-2 text-sm font-semibold">
        {item ? getItemName(item) : itemId}
      </span>
    </button>
  );
}

function RouteRecipe({
  step,
  itemById,
  facilityById,
  onSelectItem,
}: {
  step: MaterialRouteStep;
  itemById: ReadonlyMap<ItemId, Item>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const { t } = useTranslation("app");
  const facility = facilityById.get(step.recipe.facilityId);

  return (
    <div className="endfield-route-recipe w-full border border-dashed bg-background p-3 md:w-[180px] md:shrink-0">
      <div className="text-xs font-semibold">{getRecipeName(step.recipe)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {facility ? getFacilityName(facility) : step.recipe.facilityId} ·{" "}
        {step.recipe.craftingTime}s
      </div>

      {step.coInputs.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 text-[10px] font-medium text-muted-foreground">
            {t("dictionary.alsoRequires", {
              defaultValue: "Also requires",
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {step.coInputs.map((entry, index) => {
              const item = itemById.get(entry.itemId);
              return (
                <button
                  key={`${entry.itemId}-${index}`}
                  type="button"
                  onClick={() => onSelectItem(entry.itemId)}
                  title={item ? getItemName(item) : entry.itemId}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-1 text-[10px]"
                >
                  <ItemIcon item={item} size="sm" />
                  ×{formatAmount(entry.amount)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteEndpointDetail({ endpoint }: { endpoint: UsefulEndpoint }) {
  const { t } = useTranslation("app");

  if (endpoint.kind === "product") {
    return (
      <div className="endfield-route-destination flex w-full items-center justify-center border bg-primary/5 p-4 text-center text-sm font-semibold md:w-[160px] md:shrink-0">
        <Package className="mr-2 h-4 w-4" />
        {t("dictionary.completedProduct", { defaultValue: "Product" })}
      </div>
    );
  }

  if (endpoint.kind === "trade") {
    return (
      <div className="endfield-route-destination w-full border bg-muted/50 p-3 md:w-[210px] md:shrink-0">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
          <Store className="h-4 w-4" />
          {t("dictionary.regionalTrade", { defaultValue: "Regional trade" })}
        </div>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          {endpoint.tradeUses?.map((use, index) => (
            <div key={`${use.base}-${use.stage}-${index}`}>
              {use.base} · Lv.{use.stage || "?"} ·{" "}
              {t("dictionary.unitPrice", { defaultValue: "Unit" })} {use.price}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="endfield-route-destination w-full border bg-muted/50 p-3 md:w-[220px] md:shrink-0">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
        <Building2 className="h-4 w-4" />
        {t("dictionary.facilityConstruction", {
          defaultValue: "Facility construction",
        })}
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        {endpoint.facilityUses?.slice(0, 7).map((use) => (
          <div key={use.facility}>
            {use.facility} ×{use.amount}
          </div>
        ))}
        {(endpoint.facilityUses?.length ?? 0) > 7 && (
          <div>+{(endpoint.facilityUses?.length ?? 0) - 7}</div>
        )}
      </div>
    </div>
  );
}

function RequirementTreeNode({
  node,
  itemById,
  recipeById,
  facilityById,
  onSelectItem,
  depth = 0,
}: {
  node: RequirementNode;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<Recipe["id"], Recipe>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  onSelectItem: (itemId: ItemId) => void;
  depth?: number;
}) {
  const { t } = useTranslation("app");
  const item = itemById.get(node.itemId);

  const stopReason = node.cycle
    ? t("dictionary.requirementCycle", {
        defaultValue: "Cycle detected — expansion stopped",
      })
    : node.depthLimited
      ? t("dictionary.requirementDepthLimit", {
          defaultValue: "Depth limit reached",
        })
      : node.nodeLimited
        ? t("dictionary.requirementNodeLimit", {
            defaultValue: "Tree size limit reached",
          })
        : node.recipes.length === 0
          ? t("dictionary.requirementSource", {
              defaultValue: "Source material / no production recipe",
            })
          : null;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onSelectItem(node.itemId)}
        className={cn(
          "endfield-production-item flex w-full items-center gap-2 border bg-card p-2.5 text-left transition-colors hover:bg-accent",
          depth === 0 && "border-primary bg-primary/5",
          node.cycle && "border-destructive/50",
        )}
      >
        <ItemIcon item={item} size={depth === 0 ? "md" : "sm"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">
            {item ? getItemName(item) : node.itemId}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {depth === 0
              ? t("dictionary.requirementRootAmount", {
                  defaultValue: "Target amount",
                })
              : t("dictionary.requirementCumulativeAmount", {
                  defaultValue: "Required per target",
                })}
          </span>
        </span>
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-bold tabular-nums">
          ×{formatAmount(node.amount)}
        </span>
      </button>

      {stopReason ? (
        <div className="mt-1.5 border-l-2 pl-2 text-[10px] text-muted-foreground">
          {stopReason}
        </div>
      ) : (
        <div className="mt-2 space-y-2 border-l pl-2 md:pl-3">
          {node.recipes.map((branch, recipeIndex) => {
            const recipe = recipeById.get(branch.recipeId);
            const facility = recipe
              ? facilityById.get(recipe.facilityId)
              : undefined;

            return (
              <section
                key={branch.recipeId}
                className="endfield-production-process border border-dashed bg-background/70 p-2.5"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-semibold">
                    {recipe ? getRecipeName(recipe) : branch.recipeId}
                  </span>
                  {node.recipes.length > 1 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {t("dictionary.requirementAlternative", {
                        index: recipeIndex + 1,
                        defaultValue: "Alternative {{index}}",
                      })}
                    </span>
                  )}
                  {facility && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Factory className="h-3 w-3" />
                      {getFacilityName(facility)}
                    </span>
                  )}
                </div>

                {branch.inputs.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {branch.inputs.map((input, inputIndex) => (
                      <RequirementTreeNode
                        key={`${branch.recipeId}-${input.itemId}-${inputIndex}`}
                        node={input}
                        itemById={itemById}
                        recipeById={recipeById}
                        facilityById={facilityById}
                        onSelectItem={onSelectItem}
                        depth={depth + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    {t("dictionary.requirementNoInputs", {
                      defaultValue: "This recipe has no material inputs.",
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequirementTree({
  tree,
  itemById,
  recipeById,
  facilityById,
  onSelectItem,
}: {
  tree: RequirementNode;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<Recipe["id"], Recipe>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const { t } = useTranslation("app");

  return (
    <div className="space-y-3">
      <div className="endfield-production-intro border bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 shrink-0" />
          <h2 className="text-sm font-bold">
            {t("dictionary.productionRouteTitle", {
              defaultValue: "Production route",
            })}
          </h2>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("dictionary.requirementTreeDescription", {
            defaultValue:
              "Shows how to produce the selected item, expanding every required input. Quantities are cumulative amounts needed for one unit of the selected item.",
          })}
        </p>
      </div>
      <RequirementTreeNode
        node={tree}
        itemById={itemById}
        recipeById={recipeById}
        facilityById={facilityById}
        onSelectItem={onSelectItem}
      />
    </div>
  );
}

function ExternalDirectUses({ itemId }: { itemId: ItemId }) {
  const { t } = useTranslation("app");
  const external = externalItemUseById.get(itemId);

  if (!external?.facilityUses?.length && !external?.tradeUses?.length) {
    return null;
  }

  const tradeBases = new Map<string, number>();
  for (const use of external.tradeUses ?? []) {
    tradeBases.set(use.base, Math.max(tradeBases.get(use.base) ?? 0, use.price));
  }

  return (
    <div className="space-y-3">
      {!!external.facilityUses?.length && (
        <section>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
            <Factory className="h-4 w-4" />
            {t("dictionary.facilityUse", {
              defaultValue: "Facility construction",
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {external.facilityUses.map((use) => (
              <span
                key={use.facility}
                className="rounded-md bg-muted px-2 py-1 text-[11px]"
              >
                {use.facility} ×{use.amount}
              </span>
            ))}
          </div>
        </section>
      )}

      {tradeBases.size > 0 && (
        <section>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
            <Store className="h-4 w-4" />
            {t("dictionary.tradeUse", {
              defaultValue: "Regional trade",
            })}
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            {[...tradeBases.entries()].map(([base, price]) => (
              <div key={base}>
                {base} · {t("dictionary.unitPrice", { defaultValue: "Unit" })}{" "}
                {price}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function MaterialDictionary({
  items,
  recipes,
  facilities,
}: MaterialDictionaryProps) {
  const { t } = useTranslation("app");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [endpointFilter, setEndpointFilter] =
    useState<EndpointFilter>("all");
  const [mainView, setMainView] = useState<MainView>(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("section");
    if (requested === "production" || requested === "uses") return requested;
    if (params.has("endpoint")) return "uses";

    const itemId = params.get("item") as ItemId | null;
    const craftable =
      !!itemId &&
      recipes.some((recipe) =>
        recipe.outputs.some((output) => output.itemId === itemId),
      );
    return craftable ? "production" : "uses";
  });
  const [mobileDestinationsOpen, setMobileDestinationsOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const routeRef = useRef<HTMLDivElement>(null);

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item] as const)),
    [items],
  );
  const facilityById = useMemo(
    () =>
      new Map(facilities.map((facility) => [facility.id, facility] as const)),
    [facilities],
  );
  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe] as const)),
    [recipes],
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

  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("endpoint"),
  );

  const selectedItem = selectedId ? itemById.get(selectedId) : undefined;
  const selectedCategory = selectedItem
    ? getMaterialCategory(selectedItem)
    : undefined;
  const selectedSubtype = selectedItem
    ? getMaterialSubtype(selectedItem)
    : undefined;

  const producers = selectedId ? index.producedBy.get(selectedId) ?? [] : [];

  const requirementTree = useMemo(
    () =>
      selectedId
        ? buildRequirementTree(selectedId, index, {
            maxDepth: 8,
            maxNodes: 400,
          })
        : null,
    [selectedId, index],
  );

  const directUses = useMemo(
    () =>
      selectedId
        ? getMeaningfulDirectUses(selectedId, index, itemById)
        : [],
    [selectedId, index, itemById],
  );

  const endpoints = useMemo(
    () =>
      selectedId
        ? getUsefulEndpoints(selectedId, index, itemById)
        : [],
    [selectedId, index, itemById],
  );

  const visibleEndpoints = useMemo(
    () =>
      endpointFilter === "all"
        ? endpoints
        : endpoints.filter((endpoint) => endpoint.kind === endpointFilter),
    [endpoints, endpointFilter],
  );

  const selectedEndpoint = selectedEndpointId
    ? endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null
    : null;

  const route = useMemo(
    () =>
      selectedId && selectedEndpoint
        ? findShortestMaterialRoute(
            selectedId,
            selectedEndpoint.targetItemId,
            index,
            itemById,
          )
        : null,
    [selectedId, selectedEndpoint, index, itemById],
  );

  const selectedSummary = selectedId
    ? getItemUseSummary(selectedId, index, itemById)
    : null;

  const selectedDetail = selectedId
    ? getMaterialItemDetail(selectedId)
    : undefined;

  const selectItem = useCallback(
    (itemId: ItemId) => {
      if (!itemById.has(itemId)) return;

      const nextView: MainView =
        (index.producedBy.get(itemId)?.length ?? 0) > 0
          ? "production"
          : "uses";

      setSelectedId(itemId);
      setSelectedEndpointId(null);
      setEndpointFilter("all");
      setMainView(nextView);

      const url = new URL(window.location.href);
      url.searchParams.set("view", "dictionary");
      url.searchParams.set("item", itemId);
      url.searchParams.set("section", nextView);
      url.searchParams.delete("endpoint");
      window.history.replaceState(null, "", url.toString());
    },
    [itemById, index],
  );

  const selectProductionItem = useCallback(
    (itemId: ItemId) => {
      if (!itemById.has(itemId)) return;

      setSelectedId(itemId);
      setSelectedEndpointId(null);
      setEndpointFilter("all");
      setMainView("production");

      const url = new URL(window.location.href);
      url.searchParams.set("view", "dictionary");
      url.searchParams.set("item", itemId);
      url.searchParams.set("section", "production");
      url.searchParams.delete("endpoint");
      window.history.replaceState(null, "", url.toString());
    },
    [itemById],
  );

  const changeMainView = (view: MainView) => {
    setMainView(view);
    if (view === "production") {
      setSelectedEndpointId(null);
      setMobileDestinationsOpen(false);
    }

    const url = new URL(window.location.href);
    url.searchParams.set("section", view);
    if (view === "production") url.searchParams.delete("endpoint");
    window.history.replaceState(null, "", url.toString());
  };

  const showDirectUses = () => {
    setSelectedEndpointId(null);
    setMainView("uses");
    setMobileDestinationsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("section", "uses");
    url.searchParams.delete("endpoint");
    window.history.replaceState(null, "", url.toString());
  };

  const selectEndpoint = (endpoint: UsefulEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    setMainView("uses");
    setMobileDestinationsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("section", "uses");
    url.searchParams.set("endpoint", endpoint.id);
    window.history.replaceState(null, "", url.toString());

    requestAnimationFrame(() => {
      routeRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    });
  };

  const endpointCounts = useMemo(() => {
    const counts: Record<EndpointFilter, number> = {
      all: endpoints.length,
      product: 0,
      trade: 0,
      facility: 0,
    };
    for (const endpoint of endpoints) counts[endpoint.kind] += 1;
    return counts;
  }, [endpoints]);

  return (
    <section className="endfield-dictionary flex min-h-0 flex-1 flex-col gap-3">
      <div className="endfield-system-bar" aria-hidden="true">
        <span>ENDFIELD INDUSTRIES // MATERIAL RECORD</span>
        <span>SUPPLY NETWORK / ACTIVE</span>
      </div>
      <MaterialPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        items={items}
        selectedId={selectedId}
        query={query}
        onQueryChange={setQuery}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categoryCounts={categoryCounts}
        itemById={itemById}
        index={index}
        onSelectItem={selectItem}
      />


      <header className="endfield-material-header border bg-card p-2.5 md:p-3">
        {selectedItem ? (
          <div className="flex items-center gap-2 md:items-start md:gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="endfield-material-subject flex min-h-16 min-w-0 flex-1 items-center gap-2.5 border bg-background px-2.5 text-left transition-colors hover:bg-accent md:min-w-[280px] md:max-w-[320px] md:gap-3 md:px-3"
            >
              <ItemIcon item={selectedItem} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {t("dictionary.selectedItem", {
                    defaultValue: "Selected item",
                  })}
                </span>
                <span className="endfield-display-name block truncate text-lg font-bold">
                  {getItemName(selectedItem)}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {selectedCategory && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {categoryLabel(t, selectedCategory)}
                    </span>
                  )}
                  {selectedSubtype && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {subtypeLabel(t, selectedSubtype)}
                    </span>
                  )}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    T{selectedItem.tier}
                  </span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            <div className="hidden min-w-0 flex-1 md:block">
              {selectedDetail ? (
                <section
                  className={cn(
                    "endfield-description h-full border p-3",
                    selectedDetail.kind === "effect"
                      ? "border-primary/30 bg-primary/5"
                      : "bg-background",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {selectedDetail.kind === "effect" ? (
                      <HeartPulse className="h-4 w-4 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0" />
                    )}
                    <h2 className="text-xs font-semibold">
                      {selectedDetail.kind === "effect"
                        ? t("dictionary.itemEffect", { defaultValue: "Effect" })
                        : t("dictionary.itemDescription", {
                            defaultValue: "Description",
                          })}
                    </h2>
                    <a
                      href="https://arknights-endfield.wikiru.jp/?%E3%82%A2%E3%82%A4%E3%83%86%E3%83%A0%E4%B8%80%E8%A6%A7"
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[10px] text-muted-foreground hover:underline"
                    >
                      Wikiru
                    </a>
                  </div>
                  <p
                    lang="ja"
                    className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90"
                  >
                    {selectedDetail.text}
                  </p>
                </section>
              ) : (
                <div className="flex h-full min-h-16 items-center border border-dashed px-3 text-sm text-muted-foreground">
                  {t("dictionary.noItemDescription", {
                    defaultValue: "No description or effect is registered.",
                  })}
                </div>
              )}
            </div>

            <div className="hidden shrink-0 md:flex md:flex-col md:gap-1.5">
              {selectedSummary?.stockCandidate && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <Star className="h-3.5 w-3.5" />
                  {t("dictionary.stockCandidate", {
                    defaultValue: "Stock candidate",
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-muted px-2.5 py-1.5 text-center">
                  <div className="text-sm font-bold">{producers.length}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {t("dictionary.productionMethodsShort", {
                      defaultValue: "Methods",
                    })}
                  </div>
                </div>
                <div className="bg-muted px-2.5 py-1.5 text-center">
                  <div className="text-sm font-bold">
                    {selectedSummary?.directRecipeCount ?? 0}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {t("dictionary.productionUsesShort", {
                      defaultValue: "Uses",
                    })}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileInfoOpen(true)}
              className="endfield-item-info-button flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-1 border bg-background text-[9px] font-bold md:hidden"
              aria-label={t("dictionary.itemDetails", {
                defaultValue: "Item details",
              })}
            >
              <Info className="h-4 w-4" />
              {t("dictionary.detailsShort", { defaultValue: "Details" })}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex min-h-16 w-full items-center gap-3 border border-dashed bg-background px-4 text-left hover:bg-accent"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {t("dictionary.chooseMaterial", {
                  defaultValue: "Choose item",
                })}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("dictionary.chooseMaterialHint", {
                  defaultValue:
                    "Choose an item to inspect how it is produced and where it is used.",
                })}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </header>

      <Sheet open={mobileInfoOpen} onOpenChange={setMobileInfoOpen}>
        <SheetContent
          side="bottom"
          className="endfield-mobile-info-sheet max-h-[72dvh] gap-0 overflow-y-auto p-0"
        >
          {selectedItem && (
            <>
              <SheetHeader className="endfield-sidebar-header border-b pr-12">
                <SheetTitle className="text-left text-sm">
                  {getItemName(selectedItem)}
                </SheetTitle>
                <SheetDescription className="text-left text-xs">
                  {selectedCategory ? categoryLabel(t, selectedCategory) : ""}
                  {selectedSubtype ? " · " + subtypeLabel(t, selectedSubtype) : ""}
                  {" · T" + selectedItem.tier}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                {selectedDetail ? (
                  <section className="endfield-description border bg-background p-3">
                    <div className="flex items-center gap-2">
                      {selectedDetail.kind === "effect" ? (
                        <HeartPulse className="h-4 w-4 shrink-0" />
                      ) : (
                        <Info className="h-4 w-4 shrink-0" />
                      )}
                      <h2 className="text-xs font-semibold">
                        {selectedDetail.kind === "effect"
                          ? t("dictionary.itemEffect", { defaultValue: "Effect" })
                          : t("dictionary.itemDescription", {
                              defaultValue: "Description",
                            })}
                      </h2>
                      <a
                        href="https://arknights-endfield.wikiru.jp/?%E3%82%A2%E3%82%A4%E3%83%86%E3%83%A0%E4%B8%80%E8%A6%A7"
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto text-[10px] text-muted-foreground hover:underline"
                      >
                        Wikiru
                      </a>
                    </div>
                    <p
                      lang="ja"
                      className="mt-2 whitespace-pre-line text-sm leading-relaxed"
                    >
                      {selectedDetail.text}
                    </p>
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.noItemDescription", {
                      defaultValue: "No description or effect is registered.",
                    })}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="border bg-muted/40 p-3 text-center">
                    <div className="text-lg font-bold">{producers.length}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {t("dictionary.productionMethodsShort", {
                        defaultValue: "Production methods",
                      })}
                    </div>
                  </div>
                  <div className="border bg-muted/40 p-3 text-center">
                    <div className="text-lg font-bold">
                      {selectedSummary?.directRecipeCount ?? 0}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {t("dictionary.productionUsesShort", {
                        defaultValue: "Direct uses",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {selectedItem && mainView === "uses" && (
        <button
          type="button"
          onClick={() => setMobileDestinationsOpen(true)}
          className="endfield-mobile-destinations flex min-h-11 items-center gap-2 border px-3 text-left lg:hidden"
        >
          <Route className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              {t("dictionary.useDestination", { defaultValue: "Use destination" })}
            </span>
            <span className="block truncate text-sm font-semibold">
              {selectedEndpoint
                ? itemById.get(selectedEndpoint.targetItemId)
                  ? getItemName(itemById.get(selectedEndpoint.targetItemId)!)
                  : selectedEndpoint.targetItemId
                : t("dictionary.directUsesRoute", {
                    defaultValue: "Direct uses",
                  })}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-3",
          mainView === "uses" && selectedItem
            ? "lg:grid-cols-[minmax(0,1fr)_340px]"
            : "lg:grid-cols-1",
        )}
      >
        <main className="endfield-workbench flex min-h-[62dvh] min-w-0 flex-col overflow-hidden border bg-background md:min-h-[480px] lg:min-h-0">

          <div className="endfield-workbench-header flex flex-col gap-2 border-b px-2.5 py-2 md:flex-row md:items-center md:justify-between md:px-3">
            <Tabs
              value={mainView}
              onValueChange={(value) => changeMainView(value as MainView)}
              className="min-w-0"
            >
              <TabsList className="endfield-view-tabs grid h-10 w-full grid-cols-2 md:w-[340px]">
                <TabsTrigger value="production" className="gap-2">
                  <Factory className="h-4 w-4 shrink-0" />
                  <span>
                    {t("dictionary.productionView", {
                      defaultValue: "Production",
                    })}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="uses" className="gap-2">
                  <Workflow className="h-4 w-4 shrink-0" />
                  <span>
                    {t("dictionary.usesView", {
                      defaultValue: "Uses",
                    })}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex min-w-0 items-center justify-between gap-3 md:flex-1 md:justify-end">
              {selectedItem && (
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {mainView === "production"
                    ? t("dictionary.productionViewHint", {
                        item: getItemName(selectedItem),
                        defaultValue:
                          "How {{item}} is produced, including every required input.",
                      })
                    : selectedEndpoint
                      ? t("dictionary.useRouteSummary", {
                          from: getItemName(selectedItem),
                          to: itemById.get(selectedEndpoint.targetItemId)
                            ? getItemName(
                                itemById.get(selectedEndpoint.targetItemId)!,
                              )
                            : selectedEndpoint.targetItemId,
                          steps: route?.length ?? 0,
                          defaultValue:
                            "Use path: {{from}} → {{to}} · {{steps}} steps",
                        })
                      : t("dictionary.directUseHint", {
                          defaultValue:
                            "Shows where the selected item is consumed directly.",
                        })}
                </p>
              )}

              {selectedItem && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="hidden shrink-0 border bg-background px-2 py-1 text-xs hover:bg-accent md:inline-flex"
                >
                  {t("dictionary.changeMaterial", {
                    defaultValue: "Change item",
                  })}
                </button>
              )}
            </div>
          </div>

          <div
            ref={routeRef}
            className="endfield-route-canvas min-h-0 flex-1 overflow-auto p-3 md:p-5"
          >

            {!selectedItem ? (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <div className="max-w-sm text-center">
                  <GitBranch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold">
                    {t("dictionary.routeEmptyTitle", {
                      defaultValue: "Choose an item",
                    })}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dictionary.routeEmptyHint", {
                      defaultValue:
                        "Choose one item to see how it is produced and where it is used.",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="mt-4 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    {t("dictionary.chooseMaterial", {
                      defaultValue: "Choose item",
                    })}
                  </button>
                </div>
              </div>
            ) : mainView === "production" ? (
              requirementTree ? (
                <RequirementTree
                  tree={requirementTree}
                  itemById={itemById}
                  recipeById={recipeById}
                  facilityById={facilityById}
                  onSelectItem={selectProductionItem}
                />
              ) : null
            ) : selectedEndpoint && route ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2 border-b pb-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                      {t("dictionary.useRouteTitle", {
                        defaultValue: "Use path",
                      })}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {getItemName(selectedItem)} {" → "}
                      {itemById.get(selectedEndpoint.targetItemId)
                        ? getItemName(itemById.get(selectedEndpoint.targetItemId)!)
                        : selectedEndpoint.targetItemId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={showDirectUses}
                    className="shrink-0 border bg-background px-2 py-1 text-[11px] hover:bg-accent"
                  >
                    {t("dictionary.backToDirectUses", {
                      defaultValue: "Direct uses",
                    })}
                  </button>
                </div>

                <div className="space-y-2 md:hidden">
                  <RouteMaterial
                    itemId={selectedItem.id}
                    itemById={itemById}
                    onSelectItem={selectItem}
                    emphasis
                  />

                  {route.map((step, index) => (
                    <div
                      key={"mobile-" + step.recipe.id + "-" + index}
                      className="space-y-2"
                    >
                      <ArrowDown className="mx-auto h-5 w-5 text-muted-foreground" />
                      <RouteRecipe
                        step={step}
                        itemById={itemById}
                        facilityById={facilityById}
                        onSelectItem={selectItem}
                      />
                      <ArrowDown className="mx-auto h-5 w-5 text-muted-foreground" />
                      <RouteMaterial
                        itemId={step.toItemId}
                        itemById={itemById}
                        onSelectItem={selectItem}
                      />
                    </div>
                  ))}

                  <ArrowDown className="mx-auto h-5 w-5 text-muted-foreground" />
                  <RouteEndpointDetail endpoint={selectedEndpoint} />
                </div>

                <div className="hidden min-h-full min-w-max items-center md:flex">
                  <RouteMaterial
                    itemId={selectedItem.id}
                    itemById={itemById}
                    onSelectItem={selectItem}
                    emphasis
                  />

                  {route.map((step, index) => (
                    <div
                      key={step.recipe.id + "-" + index}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <ArrowRight className="mx-1 h-5 w-5 text-muted-foreground" />
                      <RouteRecipe
                        step={step}
                        itemById={itemById}
                        facilityById={facilityById}
                        onSelectItem={selectItem}
                      />
                      <ArrowRight className="mx-1 h-5 w-5 text-muted-foreground" />
                      <RouteMaterial
                        itemId={step.toItemId}
                        itemById={itemById}
                        onSelectItem={selectItem}
                      />
                    </div>
                  ))}

                  <ArrowRight className="mx-2 h-5 w-5 shrink-0 text-muted-foreground" />
                  <RouteEndpointDetail endpoint={selectedEndpoint} />
                </div>
              </>
            ) : (
              <div className="min-h-full">
                <div className="mb-3 flex items-center gap-2 border-b pb-2">
                  <Workflow className="h-4 w-4" />
                  <h2 className="text-sm font-bold">
                    {t("dictionary.directUsesView", {
                      defaultValue: "Direct uses",
                    })}
                  </h2>
                  <span className="text-[10px] text-muted-foreground">
                    {directUses.length}
                  </span>
                </div>

                <div className="grid min-w-0 gap-2 xl:grid-cols-2">
                  {directUses.length > 0 ? (
                    directUses.map((recipe) => (
                      <DirectUseLane
                        key={recipe.id}
                        recipe={recipe}
                        selectedItemId={selectedItem.id}
                        itemById={itemById}
                        facilityById={facilityById}
                        onSelectItem={selectItem}
                      />
                    ))
                  ) : (
                    <div className="border border-dashed bg-background/70 p-5 text-sm text-muted-foreground">
                      {t("dictionary.noUse", {
                        defaultValue:
                          "No normal production recipe directly consumes this item.",
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {selectedItem && mainView === "uses" ? (
          <aside className="endfield-sidebar hidden min-h-0 overflow-y-auto border bg-card lg:block">
            <div className="endfield-sidebar-header sticky top-0 z-10 border-b bg-card/95 p-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <h2 className="text-sm font-semibold">
                  {t("dictionary.useDestinations", {
                    defaultValue: "Use destinations",
                  })}
                </h2>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {endpoints.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("dictionary.destinationSidebarHint", {
                  defaultValue:
                    "Choose a reachable product, trade item, or facility use to inspect the path from this item.",
                })}
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {(
                  [
                    ["all", t("dictionary.endpointAll", { defaultValue: "All" })],
                    [
                      "product",
                      t("dictionary.products", { defaultValue: "Products" }),
                    ],
                    [
                      "trade",
                      t("dictionary.tradeDestinations", {
                        defaultValue: "Trade",
                      }),
                    ],
                    [
                      "facility",
                      t("dictionary.facilityDestinations", {
                        defaultValue: "Facilities",
                      }),
                    ],
                  ] as const
                ).map(([filter, label]) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setEndpointFilter(filter)}
                    className={cn(
                      "endfield-sidebar-filter px-2 py-1 text-[11px] font-medium transition-colors",
                      endpointFilter === filter
                        ? "is-active bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label} {endpointCounts[filter]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 p-2">
              <button
                type="button"
                onClick={showDirectUses}
                className={cn(
                  "endfield-endpoint-card flex w-full items-center gap-2 border p-2.5 text-left transition-colors",
                  selectedEndpointId === null
                    ? "border-primary bg-primary/10"
                    : "bg-background hover:bg-accent",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Workflow className="h-5 w-5" />
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {t("dictionary.directUsesRoute", {
                      defaultValue: "Direct uses",
                    })}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {directUses.length}{" "}
                    {t("dictionary.recipesCount", {
                      defaultValue: "recipes",
                    })}
                  </span>
                </span>
              </button>

              {visibleEndpoints.map((endpoint) => (
                <EndpointChoice
                  key={endpoint.id}
                  endpoint={endpoint}
                  itemById={itemById}
                  selected={selectedEndpointId === endpoint.id}
                  onSelect={() => selectEndpoint(endpoint)}
                />
              ))}

              {visibleEndpoints.length === 0 && (
                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  {t("dictionary.noUsefulDestination", {
                    defaultValue: "No useful destination is registered.",
                  })}
                </div>
              )}
            </div>

            <div className="mx-3 border-t" />

            <div className="space-y-4 p-3">
              {selectedId && <ExternalDirectUses itemId={selectedId} />}
            </div>
          </aside>
        ) : !selectedItem ? (
          <aside className="hidden border bg-card p-4 text-sm text-muted-foreground lg:block">
            {t("dictionary.contextPanelEmpty", {
              defaultValue:
                "Choose an item to inspect its production and uses.",
            })}
          </aside>
        ) : null}
      </div>

      <Sheet
        open={mobileDestinationsOpen}
        onOpenChange={setMobileDestinationsOpen}
      >
        <SheetContent
          side="bottom"
          className="endfield-mobile-destination-sheet max-h-[78dvh] gap-0 p-0"
        >
          <SheetHeader className="endfield-sidebar-header border-b pr-12">
            <SheetTitle className="text-left text-sm">
              {t("dictionary.useDestinations", {
                defaultValue: "Use destinations",
              })}
            </SheetTitle>
            <SheetDescription className="text-left text-xs">
              {t("dictionary.destinationSidebarHint", {
                defaultValue:
                  "Choose a reachable product, trade item, or facility use to inspect the path from this item.",
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap gap-1 border-b p-2">
            {(
              [
                ["all", t("dictionary.endpointAll", { defaultValue: "All" })],
                [
                  "product",
                  t("dictionary.products", { defaultValue: "Products" }),
                ],
                [
                  "trade",
                  t("dictionary.tradeDestinations", {
                    defaultValue: "Trade",
                  }),
                ],
                [
                  "facility",
                  t("dictionary.facilityDestinations", {
                    defaultValue: "Facilities",
                  }),
                ],
              ] as const
            ).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setEndpointFilter(filter)}
                className={cn(
                  "endfield-sidebar-filter px-2 py-1 text-[11px] font-medium transition-colors",
                  endpointFilter === filter
                    ? "is-active bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {label} {endpointCounts[filter]}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
            <button
              type="button"
              onClick={showDirectUses}
              className={cn(
                "endfield-endpoint-card flex w-full items-center gap-2 border p-2.5 text-left transition-colors",
                selectedEndpointId === null
                  ? "is-active border-primary bg-primary/10"
                  : "bg-background hover:bg-accent",
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-muted">
                <Workflow className="h-5 w-5" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">
                  {t("dictionary.directUsesRoute", {
                    defaultValue: "Direct uses",
                  })}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {directUses.length}{" "}
                  {t("dictionary.recipesCount", {
                    defaultValue: "recipes",
                  })}
                </span>
              </span>
            </button>

            {visibleEndpoints.map((endpoint) => (
              <EndpointChoice
                key={endpoint.id}
                endpoint={endpoint}
                itemById={itemById}
                selected={selectedEndpointId === endpoint.id}
                onSelect={() => selectEndpoint(endpoint)}
              />
            ))}

            <div className="my-3 border-t" />

            {selectedId && <ExternalDirectUses itemId={selectedId} />}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
