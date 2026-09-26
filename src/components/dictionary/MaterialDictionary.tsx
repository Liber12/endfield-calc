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
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Box,
  Boxes,
  Building2,
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
import { buildRecipeIndex } from "@/lib/material-dictionary";
import {
  findShortestMaterialRoute,
  getItemUseSummary,
  getMeaningfulDirectUses,
  getUsefulEndpoints,
  type MaterialRouteStep,
  type UsefulEndpoint,
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

type DictionaryTab = "uses" | "destinations" | "make";
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
      ? "h-9 w-9 md:h-7 md:w-7"
      : size === "lg"
        ? "h-14 w-14 md:h-12 md:w-12"
        : size === "xl"
          ? "h-16 w-16 md:h-16 md:w-16"
          : "h-12 w-12 md:h-10 md:w-10";

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
          ? "min-h-14 w-full px-3 py-2.5 md:min-h-0 md:w-auto md:px-2 md:py-1.5"
          : "min-h-11 px-2.5 py-1.5 md:min-h-0 md:px-2 md:py-1.5",
      )}
      title={itemId}
    >
      <ItemIcon item={item} size="sm" />
      <span className="text-sm font-medium md:text-xs">
        {item ? getItemName(item) : itemId}
      </span>
      {amount !== undefined && (
        <span className="text-xs text-muted-foreground md:text-[11px]">
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
  const facility = facilityById.get(recipe.facilityId);
  const coInputs = recipe.inputs.filter(
    (entry) => entry.itemId !== selectedItemId,
  );

  return (
    <article className="rounded-xl border bg-card p-4 md:p-3">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold md:truncate md:text-sm">
            {getRecipeName(recipe)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground md:truncate md:text-[11px]">
            {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
            {recipe.craftingTime}s
          </div>
        </div>
        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
        <div className="grid w-full gap-2 md:flex md:w-auto md:flex-wrap md:gap-1">
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
        <div className="mt-3 border-t pt-3 md:mt-2 md:flex md:flex-wrap md:items-center md:gap-1.5 md:pt-2">
          <div className="mb-2 text-xs font-medium text-muted-foreground md:mb-0">
            ＋ 一緒に必要
          </div>
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
    <article className="rounded-xl border bg-card p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold">{getRecipeName(recipe)}</div>
        <div className="text-[11px] text-muted-foreground">
          {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
          {recipe.craftingTime}s
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {recipe.inputs.map((entry, index) => (
          <MiniMaterialChip
            key={`in-${entry.itemId}-${index}`}
            itemId={entry.itemId}
            amount={entry.amount}
            itemById={itemById}
            onSelect={onSelectItem}
          />
        ))}
        <ArrowRight className="mx-1 h-4 w-4 text-muted-foreground" />
        {recipe.outputs.map((entry, index) => (
          <MiniMaterialChip
            key={`out-${entry.itemId}-${index}`}
            itemId={entry.itemId}
            amount={entry.amount}
            itemById={itemById}
            onSelect={onSelectItem}
          />
        ))}
      </div>
      <div className="sr-only">
        {t("dictionary.howToMake", { defaultValue: "How to make" })}
      </div>
    </article>
  );
}

function ExternalDirectUses({
  itemId,
}: {
  itemId: ItemId;
}) {
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
    <div className="grid gap-3 xl:grid-cols-2">
      {!!external.facilityUses?.length && (
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Factory className="h-4 w-4" />
            <h4 className="text-sm font-semibold">
              {t("dictionary.facilityUse", {
                defaultValue: "Facility construction",
              })}
            </h4>
            <span className="ml-auto text-xs text-muted-foreground">
              {external.facilityUses.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {external.facilityUses.map((use) => (
              <span
                key={use.facility}
                className="rounded-lg bg-muted px-3 py-2 text-sm md:px-2 md:py-1 md:text-xs"
              >
                {use.facility} ×{use.amount}
              </span>
            ))}
          </div>
        </section>
      )}

      {tradeBases.size > 0 && (
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Store className="h-4 w-4" />
            <h4 className="text-sm font-semibold">
              {t("dictionary.tradeUse", {
                defaultValue: "Regional trade",
              })}
            </h4>
            <span className="ml-auto text-xs text-muted-foreground">
              {tradeBases.size}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...tradeBases.entries()].map(([base, price]) => (
              <span
                key={base}
                className="rounded-lg bg-muted px-3 py-2 text-sm md:px-2 md:py-1 md:text-xs"
              >
                {base} · {t("dictionary.unitPrice", { defaultValue: "Unit" })}{" "}
                {price}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EndpointCard({
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

  const icon =
    endpoint.kind === "product" ? (
      <Package className="h-4 w-4" />
    ) : endpoint.kind === "trade" ? (
      <Store className="h-4 w-4" />
    ) : (
      <Factory className="h-4 w-4" />
    );

  const description =
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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-[96px] items-center gap-3 rounded-xl border p-4 text-left transition-colors md:min-h-[84px] md:p-3",
        selected
          ? "border-primary bg-primary/10"
          : "bg-card hover:bg-accent",
      )}
    >
      <ItemIcon item={item} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold md:truncate md:text-sm">
          {item ? getItemName(item) : endpoint.targetItemId}
        </span>
        <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {icon}
          {description}
        </span>
      </span>
      <Route className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
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
        "flex w-full flex-col items-center rounded-xl border bg-card p-3 text-center md:w-[112px] md:shrink-0 md:p-2",
        emphasis && "border-primary bg-primary/5",
      )}
    >
      <ItemIcon item={item} size="lg" />
      <span className="mt-1 line-clamp-2 text-sm font-semibold md:text-xs">
        {item ? getItemName(item) : itemId}
      </span>
    </button>
  );
}

function RouteRecipe({
  step,
  itemById,
  onSelectItem,
}: {
  step: MaterialRouteStep;
  itemById: ReadonlyMap<ItemId, Item>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  return (
    <div className="w-full rounded-xl border border-dashed bg-background p-3 md:w-[150px] md:shrink-0 md:p-2">
      <div className="line-clamp-2 text-sm font-semibold md:text-[11px]">
        {getRecipeName(step.recipe)}
      </div>
      {step.coInputs.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {step.coInputs.map((entry, index) => {
            const item = itemById.get(entry.itemId);
            return (
              <button
                key={`${entry.itemId}-${index}`}
                type="button"
                onClick={() => onSelectItem(entry.itemId)}
                title={item ? getItemName(item) : entry.itemId}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-1 py-0.5 text-[10px]"
              >
                <ItemIcon item={item} size="sm" />
                ×{formatAmount(entry.amount)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RouteEndpointDetail({
  endpoint,
}: {
  endpoint: UsefulEndpoint;
}) {
  const { t } = useTranslation("app");

  if (endpoint.kind === "product") {
    return (
      <div className="flex w-full items-center justify-center rounded-xl border bg-muted/50 p-4 text-center text-sm font-semibold md:w-[150px] md:shrink-0 md:p-3 md:text-xs">
        {t("dictionary.completedProduct", { defaultValue: "Product" })}
      </div>
    );
  }

  if (endpoint.kind === "trade") {
    return (
      <div className="w-full rounded-xl border bg-muted/50 p-4 md:w-[180px] md:shrink-0 md:p-3">
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
    <div className="w-full rounded-xl border bg-muted/50 p-4 md:w-[190px] md:shrink-0 md:p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
        <Building2 className="h-4 w-4" />
        {t("dictionary.facilityConstruction", {
          defaultValue: "Facility construction",
        })}
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        {endpoint.facilityUses?.slice(0, 6).map((use) => (
          <div key={use.facility}>
            {use.facility} ×{use.amount}
          </div>
        ))}
        {(endpoint.facilityUses?.length ?? 0) > 6 && (
          <div>
            +{(endpoint.facilityUses?.length ?? 0) - 6}
          </div>
        )}
      </div>
    </div>
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
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const detailRef = useRef<HTMLDivElement>(null);
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

  const selectItem = useCallback(
    (itemId: ItemId) => {
      if (!itemById.has(itemId)) return;
      setSelectedId(itemId);
      setActiveTab("uses");
      setSelectedEndpointId(null);

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

  const productEndpoints = endpoints.filter(
    (endpoint) => endpoint.kind === "product",
  );
  const tradeEndpoints = endpoints.filter(
    (endpoint) => endpoint.kind === "trade",
  );
  const facilityEndpoints = endpoints.filter(
    (endpoint) => endpoint.kind === "facility",
  );

  const selectEndpoint = (endpoint: UsefulEndpoint) => {
    setSelectedEndpointId(endpoint.id);
    requestAnimationFrame(() => {
      routeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const showMobilePicker = () => {
    setSelectedId(null);
    setSelectedEndpointId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("item");
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <section className="grid min-h-0 flex-1 gap-2 md:gap-4 md:grid-cols-[minmax(330px,390px)_minmax(0,1fr)]">
      <aside
        className={cn(
          "min-h-0 flex-col rounded-xl border bg-card",
          selectedItem ? "hidden md:flex" : "flex",
        )}
      >
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-1.5">
            {filteredItems.map((item) => {
              const active = item.id === selectedId;
              const useCount = getMeaningfulDirectUses(
                item.id,
                index,
                itemById,
              ).length;
              const subtype = getMaterialSubtype(item);
              const Icon = SUBTYPE_ICON[subtype];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectItem(item.id)}
                  className={cn(
                    "relative flex min-h-[132px] flex-col items-center rounded-xl border p-3 text-center transition-colors md:min-h-[108px] md:p-2",
                    active
                      ? "border-primary bg-primary/8"
                      : "bg-background hover:bg-accent",
                  )}
                  title={item.id}
                >
                  <ItemIcon item={item} size="lg" />
                  <span className="mt-2 line-clamp-2 text-sm font-semibold leading-tight md:mt-1 md:text-xs">
                    {getItemName(item)}
                  </span>
                  <span className="mt-auto flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {subtypeLabel(t, subtype)}
                  </span>
                  {useCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
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
        className={cn(
          "min-h-0 overflow-y-auto rounded-xl border bg-background",
          selectedItem ? "block" : "hidden md:block",
        )}
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
            <div className="sticky top-0 z-10 border-b bg-background/95 px-3 py-3 backdrop-blur md:px-5">
              <button
                type="button"
                onClick={showMobilePicker}
                className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("dictionary.backToMaterials", { defaultValue: "Materials" })}
              </button>

              <div className="flex items-center gap-3 md:flex-wrap">
                <ItemIcon item={selectedItem} size="xl" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold md:text-2xl">
                      {getItemName(selectedItem)}
                    </h2>
                    {selectedSummary?.stockCandidate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <Star className="h-3.5 w-3.5" />
                        {t("dictionary.stockCandidate", {
                          defaultValue: "Stock candidate",
                        })}
                      </span>
                    )}
                  </div>

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
                    {selectedSummary && (
                      <span className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {t("dictionary.useSummary", {
                          recipes: selectedSummary.directRecipeCount,
                          facilities: selectedSummary.facilityUseCount,
                          trades: selectedSummary.tradeBaseCount,
                          defaultValue:
                            "Production {{recipes}} / Facilities {{facilities}} / Trade {{trades}}",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedDetail && (
                <div
                  className={cn(
                    "mt-3 rounded-xl border p-3 md:p-3",
                    selectedDetail.kind === "effect"
                      ? "border-primary/30 bg-primary/5"
                      : "bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {selectedDetail.kind === "effect" ? (
                      <HeartPulse className="h-4 w-4 shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm font-semibold">
                      {selectedDetail.kind === "effect"
                        ? t("dictionary.itemEffect", {
                            defaultValue: "Effect",
                          })
                        : t("dictionary.itemDescription", {
                            defaultValue: "Description",
                          })}
                    </span>
                    <a
                      href="https://arknights-endfield.wikiru.jp/?%E3%82%A2%E3%82%A4%E3%83%86%E3%83%A0%E4%B8%80%E8%A6%A7"
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Wikiru
                    </a>
                  </div>
                  <p
                    lang="ja"
                    className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90 md:text-sm"
                  >
                    {selectedDetail.text}
                  </p>
                </div>
              )}

              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab(value as DictionaryTab)
                }
                className="mt-3 gap-0"
              >
                <TabsList className="grid h-12 w-full grid-cols-3 md:h-11 md:w-auto">
                  <TabsTrigger value="uses">
                    <Workflow className="h-4 w-4" />
                    {t("dictionary.tabUses", { defaultValue: "Uses" })}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {directUses.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="destinations">
                    <Route className="h-4 w-4" />
                    {t("dictionary.tabDestinations", {
                      defaultValue: "Destinations",
                    })}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {endpoints.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="make">
                    <Wrench className="h-4 w-4" />
                    {t("dictionary.tabMake", {
                      defaultValue: "How to make",
                    })}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as DictionaryTab)
              }
              className="p-3 md:p-5"
            >
              <TabsContent value="uses" className="mt-0 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.usedFor", { defaultValue: "Direct uses" })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.directUseHint", {
                      defaultValue:
                        "Logistics-only fill/dismantle cycles are omitted.",
                    })}
                  </p>
                </div>

                {directUses.length > 0 ? (
                  <div className="grid gap-2 2xl:grid-cols-2">
                    {directUses.map((recipe) => (
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
                    {t("dictionary.noUse", {
                      defaultValue: "No recipe consumes this item.",
                    })}
                  </p>
                )}

                <ExternalDirectUses itemId={selectedItem.id} />
              </TabsContent>

              <TabsContent value="destinations" className="mt-0 space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.useDestinations", {
                      defaultValue: "Reachable useful destinations",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.destinationHint", {
                      defaultValue:
                        "Choose one endpoint to show only the shortest production route to it.",
                    })}
                  </p>
                </div>

                {productEndpoints.length > 0 && (
                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Package className="h-4 w-4" />
                      {t("dictionary.products", { defaultValue: "Products" })}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {productEndpoints.map((endpoint) => (
                        <EndpointCard
                          key={endpoint.id}
                          endpoint={endpoint}
                          itemById={itemById}
                          selected={selectedEndpointId === endpoint.id}
                          onSelect={() => selectEndpoint(endpoint)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {tradeEndpoints.length > 0 && (
                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Store className="h-4 w-4" />
                      {t("dictionary.tradeDestinations", {
                        defaultValue: "Regional trade",
                      })}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {tradeEndpoints.map((endpoint) => (
                        <EndpointCard
                          key={endpoint.id}
                          endpoint={endpoint}
                          itemById={itemById}
                          selected={selectedEndpointId === endpoint.id}
                          onSelect={() => selectEndpoint(endpoint)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {facilityEndpoints.length > 0 && (
                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Factory className="h-4 w-4" />
                      {t("dictionary.facilityDestinations", {
                        defaultValue: "Facility construction",
                      })}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {facilityEndpoints.map((endpoint) => (
                        <EndpointCard
                          key={endpoint.id}
                          endpoint={endpoint}
                          itemById={itemById}
                          selected={selectedEndpointId === endpoint.id}
                          onSelect={() => selectEndpoint(endpoint)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {endpoints.length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t("dictionary.noUsefulDestination", {
                      defaultValue: "No useful destination is registered.",
                    })}
                  </p>
                )}

                {selectedEndpoint && route && (
                  <section
                    ref={routeRef}
                    className="rounded-2xl border bg-muted/20 p-3"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">
                        {t("dictionary.selectedRoute", {
                          defaultValue: "Selected route",
                        })}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {route.length}{" "}
                        {t("dictionary.steps", { defaultValue: "steps" })}
                      </span>
                    </div>

                    <div className="space-y-2 md:hidden">
                      <RouteMaterial
                        itemId={selectedItem.id}
                        itemById={itemById}
                        onSelectItem={selectItem}
                        emphasis
                      />

                      {route.map((step, index) => (
                        <div key={`mobile-${step.recipe.id}-${index}`} className="space-y-2">
                          <ArrowDown className="mx-auto h-5 w-5 text-muted-foreground" />
                          <RouteRecipe
                            step={step}
                            itemById={itemById}
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

                    <div className="hidden overflow-x-auto pb-2 md:block">
                      <div className="flex min-w-max items-center gap-2">
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
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            <RouteRecipe
                              step={step}
                              itemById={itemById}
                              onSelectItem={selectItem}
                            />
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            <RouteMaterial
                              itemId={step.toItemId}
                              itemById={itemById}
                              onSelectItem={selectItem}
                            />
                          </div>
                        ))}

                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <RouteEndpointDetail endpoint={selectedEndpoint} />
                      </div>
                    </div>
                  </section>
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
                  <div className="grid gap-2 xl:grid-cols-2">
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
            </Tabs>
          </div>
        )}
      </div>
    </section>
  );
}
