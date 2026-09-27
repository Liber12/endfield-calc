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
import { buildRecipeIndex } from "@/lib/material-dictionary";
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
  getMaterialSubtype,
  MATERIAL_CATEGORY_ORDER,
  type MaterialCategoryId,
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
type MainView = "dependencies" | "route";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[94vw] gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b pr-12">
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
              className="h-11 pl-9"
              placeholder={t("dictionary.search", {
                defaultValue: "Search materials",
              })}
              autoFocus
            />
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onCategoryFilterChange("all")}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                categoryFilter === "all"
                  ? "border-primary bg-primary/10"
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
                      ? "border-primary bg-primary/10"
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {filteredItems.map((item) => {
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
                    "relative flex min-h-[132px] flex-col items-center rounded-xl border p-3 text-center transition-colors",
                    active
                      ? "border-primary bg-primary/10"
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
        "flex w-full items-center gap-2 rounded-xl border p-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10"
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
    <article className="rounded-xl border bg-card p-3">
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
        "flex w-full flex-col items-center rounded-xl border bg-card p-3 text-center md:w-[128px] md:shrink-0",
        emphasis && "border-primary bg-primary/5 shadow-sm",
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
    <div className="w-full rounded-xl border border-dashed bg-background p-3 md:w-[180px] md:shrink-0">
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
      <div className="flex w-full items-center justify-center rounded-xl border bg-primary/5 p-4 text-center text-sm font-semibold md:w-[160px] md:shrink-0">
        <Package className="mr-2 h-4 w-4" />
        {t("dictionary.completedProduct", { defaultValue: "Product" })}
      </div>
    );
  }

  if (endpoint.kind === "trade") {
    return (
      <div className="w-full rounded-xl border bg-muted/50 p-3 md:w-[210px] md:shrink-0">
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
    <div className="w-full rounded-xl border bg-muted/50 p-3 md:w-[220px] md:shrink-0">
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
  const [mainView, setMainView] = useState<MainView>("dependencies");
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

      setSelectedId(itemId);
      setSelectedEndpointId(null);
      setEndpointFilter("all");
      setMainView("dependencies");

      const url = new URL(window.location.href);
      url.searchParams.set("view", "dictionary");
      url.searchParams.set("item", itemId);
      url.searchParams.delete("endpoint");
      window.history.replaceState(null, "", url.toString());
    },
    [itemById],
  );

  const showDirectUses = () => {
    setSelectedEndpointId(null);
    setMainView("dependencies");
    const url = new URL(window.location.href);
    url.searchParams.delete("endpoint");
    window.history.replaceState(null, "", url.toString());
  };

  const selectEndpoint = (endpoint: UsefulEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    setMainView("route");
    const url = new URL(window.location.href);
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
    <section className="flex min-h-0 flex-1 flex-col gap-3">
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

      <header className="rounded-xl border bg-card p-3">
        {selectedItem ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex min-h-16 min-w-0 items-center gap-3 rounded-xl border bg-background px-3 text-left transition-colors hover:bg-accent md:min-w-[280px]"
              >
                <ItemIcon item={selectedItem} size="xl" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("dictionary.routeFrom", {
                      defaultValue: "Starting material",
                    })}
                  </span>
                  <span className="block truncate text-lg font-bold">
                    {getItemName(selectedItem)}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {selectedCategory && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {categoryLabel(t, selectedCategory)}
                      </span>
                    )}
                    {selectedSubtype && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {subtypeLabel(t, selectedSubtype)}
                      </span>
                    )}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      T{selectedItem.tier}
                    </span>
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>

              <div className="min-w-0 flex-1">
                {selectedDetail ? (
                  <section
                    className={cn(
                      "h-full rounded-xl border p-3",
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
                          ? t("dictionary.itemEffect", {
                              defaultValue: "Effect",
                            })
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
                  <div className="flex h-full min-h-16 items-center rounded-xl border border-dashed px-3 text-sm text-muted-foreground">
                    {t("dictionary.noItemDescription", {
                      defaultValue: "No description or effect is registered.",
                    })}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1.5 md:flex-col">
                {selectedSummary?.stockCandidate && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <Star className="h-3.5 w-3.5" />
                    {t("dictionary.stockCandidate", {
                      defaultValue: "Stock candidate",
                    })}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg bg-muted px-2 py-1.5 text-center">
                    <div className="text-sm font-bold">
                      {selectedSummary?.directRecipeCount ?? 0}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {t("dictionary.productionUsesShort", {
                        defaultValue: "Recipes",
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted px-2 py-1.5 text-center">
                    <div className="text-sm font-bold">
                      {selectedSummary?.facilityUseCount ?? 0}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {t("dictionary.facilitiesShort", {
                        defaultValue: "Facilities",
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted px-2 py-1.5 text-center">
                    <div className="text-sm font-bold">
                      {selectedSummary?.tradeBaseCount ?? 0}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {t("dictionary.tradeShort", {
                        defaultValue: "Trade",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-dashed bg-background px-4 text-left hover:bg-accent"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {t("dictionary.chooseMaterial", {
                  defaultValue: "Choose starting material",
                })}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("dictionary.chooseMaterialHint", {
                  defaultValue:
                    "Pick the material whose direct uses and production routes you want to inspect.",
                })}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border bg-background lg:min-h-0">
          <div className="flex flex-col gap-2 border-b px-3 py-2 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={mainView}
              onValueChange={(value) => setMainView(value as MainView)}
              className="min-w-0"
            >
              <TabsList className="grid h-9 w-full grid-cols-2 md:w-[320px]">
                <TabsTrigger value="dependencies" className="gap-2">
                  <Workflow className="h-4 w-4 shrink-0" />
                  <span>
                    {t("dictionary.dependenciesView", {
                      defaultValue: "Dependencies",
                    })}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="route" className="gap-2">
                  <Route className="h-4 w-4 shrink-0" />
                  <span>
                    {t("dictionary.routeView", {
                      defaultValue: "Production route",
                    })}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex min-w-0 items-center justify-between gap-3 md:flex-1 md:justify-end">
              {selectedItem && (
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {mainView === "route"
                    ? selectedEndpoint
                      ? t("dictionary.routeSummary", {
                          from: getItemName(selectedItem),
                          to: itemById.get(selectedEndpoint.targetItemId)
                            ? getItemName(
                                itemById.get(selectedEndpoint.targetItemId)!,
                              )
                            : selectedEndpoint.targetItemId,
                          steps: route?.length ?? 0,
                          defaultValue: "{{from}} → {{to}} · {{steps}} steps",
                        })
                      : t("dictionary.routeNeedsDestination", {
                          defaultValue:
                            "Choose a destination from the right sidebar.",
                        })
                    : t("dictionary.directUseHint", {
                        defaultValue:
                          "Shows only recipes that directly consume the selected material.",
                      })}
                </p>
              )}

              {selectedItem && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent"
                >
                  {t("dictionary.changeMaterial", {
                    defaultValue: "Change material",
                  })}
                </button>
              )}
            </div>
          </div>

          <div
            ref={routeRef}
            className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] bg-[size:22px_22px] p-3 md:p-5"
          >
            {!selectedItem ? (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <div className="max-w-sm text-center">
                  <GitBranch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold">
                    {t("dictionary.routeEmptyTitle", {
                      defaultValue: "Start with a material",
                    })}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dictionary.routeEmptyHint", {
                      defaultValue:
                        "Choose one material. Its direct uses appear here immediately, then you can switch to any useful final destination.",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    {t("dictionary.chooseMaterial", {
                      defaultValue: "Choose material",
                    })}
                  </button>
                </div>
              </div>
            ) : mainView === "route" ? (
              selectedEndpoint && route ? (
              <>
                <div className="space-y-2 md:hidden">
                  <RouteMaterial
                    itemId={selectedItem.id}
                    itemById={itemById}
                    onSelectItem={selectItem}
                    emphasis
                  />

                  {route.map((step, index) => (
                    <div
                      key={`mobile-${step.recipe.id}-${index}`}
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
                      key={`${step.recipe.id}-${index}`}
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
                <div className="flex min-h-full items-center justify-center">
                  <div className="max-w-sm rounded-xl border border-dashed bg-background/80 p-5 text-center">
                    <Route className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">
                      {t("dictionary.routeNeedsDestinationTitle", {
                        defaultValue: "Choose a destination",
                      })}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t("dictionary.routeNeedsDestination", {
                        defaultValue:
                          "Choose a product, trade item, or facility from the right sidebar to show its route.",
                      })}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-h-full flex-col gap-3 md:flex-row md:items-start">
                <div className="md:sticky md:left-0 md:top-0 md:w-[140px] md:shrink-0">
                  <RouteMaterial
                    itemId={selectedItem.id}
                    itemById={itemById}
                    onSelectItem={selectItem}
                    emphasis
                  />
                  <div className="mt-2 text-center text-[11px] text-muted-foreground">
                    {t("dictionary.consumedBy", {
                      defaultValue: "consumed by",
                    })}
                  </div>
                </div>

                <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted-foreground md:mt-12 md:block" />

                <div className="grid min-w-0 flex-1 gap-2 xl:grid-cols-2">
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
                    <div className="rounded-xl border border-dashed bg-background/70 p-5 text-sm text-muted-foreground">
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

        {selectedItem ? (
          <aside className="min-h-0 overflow-y-auto rounded-xl border bg-card">
            <div className="sticky top-0 z-10 border-b bg-card/95 p-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <h2 className="text-sm font-semibold">
                  {t("dictionary.useDestinations", {
                    defaultValue: "Reachable useful destinations",
                  })}
                </h2>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {endpoints.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("dictionary.destinationSidebarHint", {
                  defaultValue:
                    "Choose a product, trade item, or facility use to show only that route in the main view.",
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
                      "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      endpointFilter === filter
                        ? "bg-foreground text-background"
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
                  "flex w-full items-center gap-2 rounded-xl border p-2.5 text-left transition-colors",
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
              <ExternalDirectUses itemId={selectedItem.id} />

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  <h3 className="text-xs font-semibold">
                    {t("dictionary.howToMake", {
                      defaultValue: "How to make",
                    })}
                  </h3>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {producers.length}
                  </span>
                </div>

                {producers.length > 0 ? (
                  <div className="space-y-2">
                    {producers.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="rounded-lg border bg-background p-2"
                      >
                        <div className="text-[11px] font-semibold">
                          {getRecipeName(recipe)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {recipe.inputs.map((entry, index) => (
                            <MiniMaterialChip
                              key={`${entry.itemId}-${index}`}
                              itemId={entry.itemId}
                              amount={entry.amount}
                              itemById={itemById}
                              onSelect={selectItem}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("dictionary.noProducer", {
                      defaultValue:
                        "No production recipe is registered for this item.",
                    })}
                  </p>
                )}
              </section>
            </div>
          </aside>
        ) : (
          <aside className="hidden rounded-xl border bg-card p-4 text-sm text-muted-foreground lg:block">
            {t("dictionary.contextPanelEmpty", {
              defaultValue:
                "Choose a material to see reachable products and other destinations here.",
            })}
          </aside>
        )}
      </div>
    </section>
  );
}
