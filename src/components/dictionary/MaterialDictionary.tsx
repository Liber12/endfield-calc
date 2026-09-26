import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ChevronRight,
  CircleAlert,
  GitBranch,
  Search,
  Undo2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
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

function ItemToken({
  itemId,
  amount,
  itemById,
  highlight,
}: {
  itemId: ItemId;
  amount: number;
  itemById: ReadonlyMap<ItemId, Item>;
  highlight?: boolean;
}) {
  const item = itemById.get(itemId);
  const name = item ? getItemName(item) : itemId;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs",
        highlight && "border-primary/60 bg-primary/5",
      )}
      title={itemId}
    >
      <ItemIcon item={item} size="sm" />
      <span>{name}</span>
      <span className="text-muted-foreground">×{formatAmount(amount)}</span>
    </span>
  );
}

function RecipeCard({
  recipe,
  itemById,
  facilityById,
  highlightItemId,
}: {
  recipe: Recipe;
  itemById: ReadonlyMap<ItemId, Item>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  highlightItemId?: ItemId;
}) {
  const facility = facilityById.get(recipe.facilityId);
  const recipeName = getRecipeName(recipe);

  return (
    <article className="rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{recipeName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {facility ? getFacilityName(facility) : recipe.facilityId} ·{" "}
            {recipe.craftingTime}s
          </div>
        </div>
        <code
          className="max-w-full truncate text-[10px] text-muted-foreground"
          title={recipe.id}
        >
          {recipe.id}
        </code>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {recipe.inputs.length > 0 ? (
            recipe.inputs.map((entry, index) => (
              <ItemToken
                key={`${entry.itemId}-${index}`}
                itemId={entry.itemId}
                amount={entry.amount}
                itemById={itemById}
                highlight={entry.itemId === highlightItemId}
              />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          →
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {recipe.outputs.length > 0 ? (
            recipe.outputs.map((entry, index) => (
              <ItemToken
                key={`${entry.itemId}-${index}`}
                itemId={entry.itemId}
                amount={entry.amount}
                itemById={itemById}
                highlight={entry.itemId === highlightItemId}
              />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </article>
  );
}

function UsageTreeRow({
  node,
  itemById,
  recipeById,
  depth,
  t,
}: {
  node: UsageTreeNode;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<RecipeId, Recipe>;
  depth: number;
  t: TFunction<"app">;
}) {
  const [open, setOpen] = useState(false);
  const item = itemById.get(node.itemId);
  const recipe = node.viaRecipeId ? recipeById.get(node.viaRecipeId) : undefined;
  const canExpand =
    !node.cycle &&
    !node.depthLimited &&
    !node.nodeLimited &&
    node.children.length > 0;

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
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}

        <ItemIcon item={item} size="sm" />
        <div className="min-w-0 text-sm">
          {recipe && (
            <span className="text-muted-foreground" title={recipe.id}>
              {getRecipeName(recipe)} →{" "}
            </span>
          )}
          <span className="font-medium" title={node.itemId}>
            {item ? getItemName(item) : node.itemId}
          </span>
        </div>

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

      {open &&
        node.children.map((child, index) => (
          <UsageTreeRow
            key={`${child.viaRecipeId ?? "root"}:${child.itemId}:${index}`}
            node={child}
            itemById={itemById}
            recipeById={recipeById}
            depth={depth + 1}
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
}: {
  rootItemId: ItemId;
  index: RecipeIndex;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<RecipeId, Recipe>;
}) {
  const { t } = useTranslation("app");
  const tree = useMemo(
    () => buildUsageTree(rootItemId, index, { maxDepth: 8, maxNodes: 600 }),
    [rootItemId, index],
  );

  if (tree.children.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("dictionary.noDownstream", {
          defaultValue: "No downstream uses found.",
        })}
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card px-2 py-1">
      {tree.children.map((child, indexInTree) => (
        <UsageTreeRow
          key={`${child.viaRecipeId ?? "root"}:${child.itemId}:${indexInTree}`}
          node={child}
          itemById={itemById}
          recipeById={recipeById}
          depth={0}
          t={t}
        />
      ))}
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

  const [selectedId, setSelectedId] = useState<ItemId | null>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(
      "item",
    ) as ItemId | null;
    return fromUrl && items.some((item) => item.id === fromUrl) ? fromUrl : null;
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "dictionary");
    if (selectedId) url.searchParams.set("item", selectedId);
    else url.searchParams.delete("item");
    window.history.replaceState(null, "", url.toString());
  }, [selectedId]);

  const sortedItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(i18n.language);
    return [...items]
      .filter((item) => {
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
              placeholder={t("dictionary.search", {
                defaultValue: "Search materials",
              })}
              aria-label={t("dictionary.search", {
                defaultValue: "Search materials",
              })}
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
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/70",
                )}
              >
                <ItemIcon item={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {getItemName(item)}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.id}
                  </span>
                </span>
                <span
                  className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  title={t("dictionary.directUses", {
                    defaultValue: "Direct uses",
                  })}
                >
                  {useCount}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-h-0 overflow-y-auto rounded-xl border bg-background p-4 md:p-5">
        {!selectedItem ? (
          <div className="flex h-full min-h-52 items-center justify-center text-center">
            <div>
              <GitBranch className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">
                {t("dictionary.selectPrompt", {
                  defaultValue:
                    "Select a material to see how it is made and where it is used.",
                })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dictionary.directSafe", {
                  defaultValue:
                    "Direct usage lookup does not recursively traverse recipes.",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            <header className="flex flex-wrap items-start gap-3 border-b pb-4">
              <ItemIcon item={selectedItem} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold">
                  {getItemName(selectedItem)}
                </h2>
                <code className="text-xs text-muted-foreground">
                  {selectedItem.id}
                </code>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded bg-muted px-2 py-1">
                    T{selectedItem.tier}
                  </span>
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
                      {t("dictionary.internal", {
                        defaultValue: "Intermediate/internal",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-lg font-semibold">
                    {producers.length}
                  </div>
                  <div className="text-muted-foreground">
                    {t("dictionary.madeBy", { defaultValue: "Ways to make" })}
                  </div>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <div className="text-lg font-semibold">{uses.length}</div>
                  <div className="text-muted-foreground">
                    {t("dictionary.directUses", {
                      defaultValue: "Direct uses",
                    })}
                  </div>
                </div>
              </div>
            </header>

            <section>
              <h3 className="mb-2 text-lg font-semibold">
                {t("dictionary.howToMake", { defaultValue: "How to make" })}
              </h3>
              {producers.length > 0 ? (
                <div className="space-y-2">
                  {producers.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      itemById={itemById}
                      facilityById={facilityById}
                      highlightItemId={selectedItem.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {t("dictionary.noProducer", {
                    defaultValue:
                      "No production recipe is registered for this item.",
                  })}
                </p>
              )}
            </section>

            <section>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t("dictionary.usedFor", { defaultValue: "Direct uses" })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("dictionary.usedForHint", {
                      defaultValue:
                        "Every recipe that consumes this item. This list is non-recursive and cannot loop.",
                    })}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {t("dictionary.recipeCount", {
                    count: uses.length,
                    defaultValue: "{{count}} recipes",
                  })}
                </span>
              </div>

              {uses.length > 0 ? (
                <div className="space-y-2">
                  {uses.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      itemById={itemById}
                      facilityById={facilityById}
                      highlightItemId={selectedItem.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {t("dictionary.noUse", {
                    defaultValue: "No recipe consumes this item.",
                  })}
                </p>
              )}
            </section>

            <section>
              <h3 className="text-lg font-semibold">
                {t("dictionary.downstream", {
                  defaultValue: "Downstream usage tree",
                })}
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("dictionary.downstreamHint", {
                  defaultValue:
                    "Recursive expansion stops at cycles and has depth/node limits as a second safeguard.",
                })}
              </p>
              <UsageTree
                rootItemId={selectedItem.id}
                index={index}
                itemById={itemById}
                recipeById={recipeById}
              />
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
