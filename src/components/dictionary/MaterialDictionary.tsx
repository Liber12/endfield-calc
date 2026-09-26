import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ArrowRight,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  CircleAlert,
  GitBranch,
  Search,
  Undo2,
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
  buildUsageTree,
  type RecipeIndex,
  type UsageTreeNode,
} from "@/lib/material-dictionary";
import type { Facility, Item, ItemId, Recipe, RecipeId } from "@/types";

type MaterialDictionaryProps = {
  items: readonly Item[];
  recipes: readonly Recipe[];
  facilities: readonly Facility[];
};

type DictionaryTab = "uses" | "make" | "tree";

function formatAmount(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(3)));
}

function ItemIcon({
  item,
  size = "md",
}: {
  item?: Item;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-14 w-14" : "h-9 w-9";
  return item?.iconUrl ? (
    <img
      src={item.iconUrl}
      alt=""
      className={cn(sizeClass, "shrink-0 rounded object-contain")}
      loading="lazy"
    />
  ) : (
    <div
      className={cn(sizeClass, "shrink-0 rounded bg-muted")}
      aria-hidden="true"
    />
  );
}

function ItemButton({
  itemId,
  amount,
  itemById,
  highlight,
  onSelect,
}: {
  itemId: ItemId;
  amount?: number;
  itemById: ReadonlyMap<ItemId, Item>;
  highlight?: boolean;
  onSelect: (itemId: ItemId) => void;
}) {
  const item = itemById.get(itemId);
  const name = item ? getItemName(item) : itemId;
  return (
    <button
      type="button"
      onClick={() => onSelect(itemId)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-left text-xs transition-colors hover:bg-accent",
        highlight && "border-primary/60 bg-primary/5",
      )}
      title={itemId}
    >
      <ItemIcon item={item} size="sm" />
      <span>{name}</span>
      {amount !== undefined && (
        <span className="text-muted-foreground">×{formatAmount(amount)}</span>
      )}
    </button>
  );
}

function RecipeCard({
  recipe,
  itemById,
  facilityById,
  highlightItemId,
  onSelectItem,
}: {
  recipe: Recipe;
  itemById: ReadonlyMap<ItemId, Item>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  highlightItemId?: ItemId;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const facility = facilityById.get(recipe.facilityId);
  return (
    <article className="rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{getRecipeName(recipe)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
            {recipe.craftingTime}s
          </div>
        </div>
        <code className="max-w-full truncate text-[10px] text-muted-foreground" title={recipe.id}>
          {recipe.id}
        </code>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {recipe.inputs.length > 0 ? recipe.inputs.map((entry, index) => (
            <ItemButton
              key={`${entry.itemId}-${index}`}
              itemId={entry.itemId}
              amount={entry.amount}
              itemById={itemById}
              highlight={entry.itemId === highlightItemId}
              onSelect={onSelectItem}
            />
          )) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">→</span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {recipe.outputs.length > 0 ? recipe.outputs.map((entry, index) => (
            <ItemButton
              key={`${entry.itemId}-${index}`}
              itemId={entry.itemId}
              amount={entry.amount}
              itemById={itemById}
              highlight={entry.itemId === highlightItemId}
              onSelect={onSelectItem}
            />
          )) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </div>
    </article>
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
  const otherInputs = recipe.inputs.filter(
    (entry) => entry.itemId !== selectedItemId,
  );

  return (
    <article className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{getRecipeName(recipe)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
            {recipe.craftingTime}s
          </div>
        </div>
        <code className="max-w-full truncate text-[10px] text-muted-foreground" title={recipe.id}>
          {recipe.id}
        </code>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">
          {t("dictionary.outputs", { defaultValue: "Produces" })}
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.outputs.map((entry, index) => {
            const item = itemById.get(entry.itemId);
            return (
              <button
                key={`${entry.itemId}-${index}`}
                type="button"
                onClick={() => onSelectItem(entry.itemId)}
                className="group flex min-w-[160px] flex-1 items-center gap-2 rounded-lg border bg-background p-2.5 text-left transition-colors hover:bg-accent"
              >
                <ItemIcon item={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item ? getItemName(item) : entry.itemId}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ×{formatAmount(entry.amount)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>

      {otherInputs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs text-muted-foreground">
            {t("dictionary.otherInputs", { defaultValue: "Also requires" })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {otherInputs.map((entry, index) => (
              <ItemButton
                key={`${entry.itemId}-${index}`}
                itemId={entry.itemId}
                amount={entry.amount}
                itemById={itemById}
                onSelect={onSelectItem}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function UsageTreeRow({
  node,
  itemById,
  recipeById,
  depth,
  expandDepth,
  onSelectItem,
  t,
}: {
  node: UsageTreeNode;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<RecipeId, Recipe>;
  depth: number;
  expandDepth: number;
  onSelectItem: (itemId: ItemId) => void;
  t: TFunction<"app">;
}) {
  const [open, setOpen] = useState(depth < expandDepth);
  const item = itemById.get(node.itemId);
  const recipe = node.viaRecipeId ? recipeById.get(node.viaRecipeId) : undefined;
  const canExpand =
    !node.cycle &&
    !node.depthLimited &&
    !node.nodeLimited &&
    node.children.length > 0;

  useEffect(() => {
    setOpen(depth < expandDepth);
  }, [depth, expandDepth]);

  return (
    <div className={cn(depth > 0 && "ml-4 border-l pl-3")}>
      <div className="flex min-w-0 items-center gap-1.5 py-1.5">
        {canExpand ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
            aria-label={
              open
                ? t("dictionary.collapse", { defaultValue: "Collapse" })
                : t("dictionary.expand", { defaultValue: "Expand" })
            }
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}

        <ItemIcon item={item} size="sm" />
        <button
          type="button"
          onClick={() => onSelectItem(node.itemId)}
          className="min-w-0 text-left text-sm hover:underline"
          title={node.itemId}
        >
          {recipe && (
            <span className="text-muted-foreground">
              {getRecipeName(recipe)} →{" "}
            </span>
          )}
          <span className="font-medium">{item ? getItemName(item) : node.itemId}</span>
        </button>

        {node.cycle && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
            <Undo2 className="h-3 w-3" />
            {t("dictionary.cycle", { defaultValue: "Cycle" })}
          </span>
        )}
        {(node.depthLimited || node.nodeLimited) && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <CircleAlert className="h-3 w-3" />
            {t("dictionary.limit", { defaultValue: "Expansion limit" })}
          </span>
        )}
      </div>

      {open && node.children.map((child, index) => (
        <UsageTreeRow
          key={`${child.viaRecipeId ?? "root"}:${child.itemId}:${index}`}
          node={child}
          itemById={itemById}
          recipeById={recipeById}
          depth={depth + 1}
          expandDepth={expandDepth}
          onSelectItem={onSelectItem}
          t={t}
        />
      ))}
    </div>
  );
}

function UsageTree({
  rootItemId,
  index,
  itemById,
  recipeById,
  onSelectItem,
}: {
  rootItemId: ItemId;
  index: RecipeIndex;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<RecipeId, Recipe>;
  onSelectItem: (itemId: ItemId) => void;
}) {
  const { t } = useTranslation("app");
  const [expandDepth, setExpandDepth] = useState(2);
  const tree = useMemo(
    () => buildUsageTree(rootItemId, index, { maxDepth: 8, maxNodes: 600 }),
    [rootItemId, index],
  );

  useEffect(() => {
    setExpandDepth(2);
  }, [rootItemId]);

  if (tree.children.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t("dictionary.noDownstream", { defaultValue: "No downstream uses found." })}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={expandDepth === 2 ? "secondary" : "outline"}
          onClick={() => setExpandDepth(2)}
        >
          <ChevronsDown className="h-4 w-4" />
          {t("dictionary.expandTwo", { defaultValue: "Open 2 levels" })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={expandDepth >= 8 ? "secondary" : "outline"}
          onClick={() => setExpandDepth(8)}
        >
          <ChevronsDown className="h-4 w-4" />
          {t("dictionary.expandAll", { defaultValue: "Open all" })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={expandDepth === 0 ? "secondary" : "outline"}
          onClick={() => setExpandDepth(0)}
        >
          <ChevronsUp className="h-4 w-4" />
          {t("dictionary.collapseAll", { defaultValue: "Collapse all" })}
        </Button>
      </div>

      <div className="rounded-lg border bg-card px-2 py-1">
        {tree.children.map((child, indexInTree) => (
          <UsageTreeRow
            key={`${child.viaRecipeId ?? "root"}:${child.itemId}:${indexInTree}`}
            node={child}
            itemById={itemById}
            recipeById={recipeById}
            depth={0}
            expandDepth={expandDepth}
            onSelectItem={onSelectItem}
            t={t}
          />
        ))}
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
  const [activeTab, setActiveTab] = useState<DictionaryTab>("uses");
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
    () => new Map(facilities.map((facility) => [facility.id, facility] as const)),
    [facilities],
  );
  const index = useMemo(() => buildRecipeIndex(recipes), [recipes]);

  const [selectedId, setSelectedId] = useState<ItemId | null>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("item") as ItemId | null;
    return fromUrl && items.some((item) => item.id === fromUrl) ? fromUrl : null;
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "dictionary");
    if (selectedId) url.searchParams.set("item", selectedId);
    else url.searchParams.delete("item");
    window.history.replaceState(null, "", url.toString());
  }, [selectedId]);

  const selectItem = (itemId: ItemId) => {
    if (!itemById.has(itemId)) return;
    setSelectedId(itemId);
    setActiveTab("uses");
    requestAnimationFrame(() => {
      detailRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const sortedItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(i18n.language);
    return [...items]
      .filter((item) => {
        if (!normalized) return true;
        const name = getItemName(item).toLocaleLowerCase(i18n.language);
        return name.includes(normalized) || item.id.toLocaleLowerCase().includes(normalized);
      })
      .sort((a, b) =>
        getItemName(a).localeCompare(getItemName(b), i18n.language, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [items, query, i18n.language]);

  const selectedItem = selectedId ? itemById.get(selectedId) : undefined;
  const producers = selectedId ? index.producedBy.get(selectedId) ?? [] : [];
  const uses = selectedId ? index.usedBy.get(selectedId) ?? [] : [];

  return (
    <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(250px,330px)_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-xl border bg-card">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
              placeholder={t("dictionary.search", { defaultValue: "Search materials" })}
              aria-label={t("dictionary.search", { defaultValue: "Search materials" })}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {t("dictionary.resultCount", {
              count: sortedItems.length,
              defaultValue: "{{count}} items",
            })}
          </div>
        </div>

        <div className="max-h-[34vh] overflow-y-auto p-1 md:max-h-none md:flex-1">
          {sortedItems.map((item) => {
            const active = item.id === selectedId;
            const useCount = index.usedBy.get(item.id)?.length ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
                )}
              >
                <ItemIcon item={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{getItemName(item)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{item.id}</span>
                </span>
                <span
                  className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  title={t("dictionary.directUses", { defaultValue: "Direct uses" })}
                >
                  {useCount}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div ref={detailRef} className="min-h-0 overflow-y-auto rounded-xl border bg-background">
        {!selectedItem ? (
          <div className="flex h-full min-h-52 items-center justify-center p-6 text-center">
            <div>
              <GitBranch className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">
                {t("dictionary.selectPrompt", {
                  defaultValue: "Select a material to see how it is made and where it is used.",
                })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dictionary.directSafe", {
                  defaultValue: "Direct usage lookup does not recursively traverse recipes.",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-full">
            <div className="sticky top-0 z-10 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur md:px-5">
              <div className="mx-auto max-w-5xl">
                <div className="flex flex-wrap items-start gap-3">
                  <ItemIcon item={selectedItem} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold">{getItemName(selectedItem)}</h2>
                    <code className="text-xs text-muted-foreground">{selectedItem.id}</code>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded bg-muted px-2 py-1">T{selectedItem.tier}</span>
                      {selectedItem.isLiquid && (
                        <span className="rounded bg-muted px-2 py-1">
                          {t("dictionary.liquid", { defaultValue: "Liquid" })}
                        </span>
                      )}
                      {selectedItem.isGas && (
                        <span className="rounded bg-muted px-2 py-1">
                          {t("dictionary.gas", { defaultValue: "Gas" })}
                        </span>
                      )}
                      {selectedItem.asTarget === false && (
                        <span className="rounded bg-muted px-2 py-1">
                          {t("dictionary.internal", { defaultValue: "Intermediate/internal" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg border px-3 py-2">
                      <div className="text-lg font-semibold">{producers.length}</div>
                      <div className="text-muted-foreground">
                        {t("dictionary.madeBy", { defaultValue: "Ways to make" })}
                      </div>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <div className="text-lg font-semibold">{uses.length}</div>
                      <div className="text-muted-foreground">
                        {t("dictionary.directUses", { defaultValue: "Direct uses" })}
                      </div>
                    </div>
                  </div>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as DictionaryTab)}
                  className="mt-4 gap-0"
                >
                  <TabsList className="grid h-10 w-full grid-cols-3 md:w-auto">
                    <TabsTrigger value="uses">
                      <Workflow className="h-4 w-4" />
                      {t("dictionary.tabUses", { defaultValue: "Uses" })}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{uses.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="make">
                      <Wrench className="h-4 w-4" />
                      {t("dictionary.tabMake", { defaultValue: "How to make" })}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{producers.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="tree">
                      <GitBranch className="h-4 w-4" />
                      {t("dictionary.tabTree", { defaultValue: "Usage tree" })}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as DictionaryTab)}
              className="mx-auto max-w-5xl p-4 md:p-5"
            >
              <TabsContent value="uses" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.usedFor", { defaultValue: "Direct uses" })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.usedForHint", {
                      defaultValue: "Every recipe that consumes this item. This list is non-recursive and cannot loop.",
                    })}
                  </p>
                </div>
                {uses.length > 0 ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {uses.map((recipe) => (
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
                    {t("dictionary.noUse", { defaultValue: "No recipe consumes this item." })}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="make" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.howToMake", { defaultValue: "How to make" })}
                  </h3>
                </div>
                {producers.length > 0 ? (
                  <div className="space-y-3">
                    {producers.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        itemById={itemById}
                        facilityById={facilityById}
                        highlightItemId={selectedItem.id}
                        onSelectItem={selectItem}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t("dictionary.noProducer", {
                      defaultValue: "No production recipe is registered for this item.",
                    })}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="tree" className="mt-0">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.downstream", { defaultValue: "Downstream usage tree" })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dictionary.downstreamHint", {
                      defaultValue: "Recursive expansion stops at cycles and has depth/node limits as a second safeguard.",
                    })}
                  </p>
                </div>
                <UsageTree
                  rootItemId={selectedItem.id}
                  index={index}
                  itemById={itemById}
                  recipeById={recipeById}
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
