import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleAlert, Combine, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getLayoutedElements } from "@/lib/layout";
import {
  buildMaterialUsageGraph,
} from "@/lib/material-usage-graph";
import type { RecipeIndex } from "@/lib/material-dictionary";
import {
  getItemName,
  getRecipeName,
} from "@/lib/i18n-helpers";
import type { Item, ItemId, Recipe, RecipeId } from "@/types";
import { cn } from "@/lib/utils";

type MaterialUsageGraphProps = {
  rootItemId: ItemId;
  index: RecipeIndex;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<RecipeId, Recipe>;
  hideTerminalPackaging: boolean;
  onSelectItem: (itemId: ItemId) => void;
};

type MaterialItemNodeData = {
  item: Item;
  root: boolean;
  onSelectItem: (itemId: ItemId) => void;
  [key: string]: unknown;
};

type MaterialRecipeNodeData = {
  recipe: Recipe;
  itemById: ReadonlyMap<ItemId, Item>;
  onSelectItem: (itemId: ItemId) => void;
  [key: string]: unknown;
};

function MaterialItemNode({ data }: NodeProps<Node<MaterialItemNodeData>>) {
  const { item, root, onSelectItem } = data;

  return (
    <div
      className={cn(
        "relative w-[208px] rounded-2xl border bg-card p-3 shadow-sm",
        root && "border-primary ring-2 ring-primary/20",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2"
      />

      <button
        type="button"
        onClick={() => onSelectItem(item.id)}
        className="flex w-full items-center gap-3 text-left"
      >
        {item.iconUrl ? (
          <img
            src={item.iconUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-contain"
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-md bg-muted" />
        )}
        <span className="min-w-0">
          <span className="block line-clamp-2 text-sm font-semibold">
            {getItemName(item)}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            T{item.tier}
          </span>
        </span>
      </button>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2"
      />
    </div>
  );
}

function MaterialRecipeNode({
  data,
}: NodeProps<Node<MaterialRecipeNodeData>>) {
  const { t } = useTranslation("app");
  const { recipe, itemById, onSelectItem } = data;

  return (
    <div className="relative w-[208px] rounded-2xl border border-dashed bg-background p-3 shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2"
      />

      <div className="flex items-start gap-2">
        <Combine className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="line-clamp-2 text-xs font-semibold">
            {getRecipeName(recipe)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {recipe.craftingTime}s
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="mb-1 text-[10px] font-medium text-muted-foreground">
          {t("dictionary.inputs", { defaultValue: "Inputs" })}
        </div>
        <div className="flex flex-wrap gap-1">
          {recipe.inputs.slice(0, 4).map((entry, index) => {
            const item = itemById.get(entry.itemId);
            return (
              <button
                key={`${entry.itemId}-${index}`}
                type="button"
                onClick={() => onSelectItem(entry.itemId)}
                className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-1 text-[10px] hover:bg-accent"
                title={item ? getItemName(item) : entry.itemId}
              >
                {item?.iconUrl ? (
                  <img
                    src={item.iconUrl}
                    alt=""
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : (
                  <span className="h-5 w-5 rounded bg-background" />
                )}
                <span>×{entry.amount}</span>
              </button>
            );
          })}
          {recipe.inputs.length > 4 && (
            <span className="rounded-md bg-muted px-1.5 py-1 text-[10px] text-muted-foreground">
              +{recipe.inputs.length - 4}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  materialItem: MaterialItemNode,
  materialRecipe: MaterialRecipeNode,
};

export default function MaterialUsageGraph({
  rootItemId,
  index,
  itemById,
  recipeById,
  hideTerminalPackaging,
  onSelectItem,
}: MaterialUsageGraphProps) {
  const { t } = useTranslation("app");
  const graph = useMemo(
    () =>
      buildMaterialUsageGraph(rootItemId, index, itemById, {
        hideTerminalPackaging,
        maxDepth: 7,
        maxNodes: 180,
      }),
    [rootItemId, index, itemById, hideTerminalPackaging],
  );

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layouting, setLayouting] = useState(true);

  useEffect(() => {
    let stale = false;
    setLayouting(true);

    const rawNodes: Node[] = [];

    for (const itemId of graph.itemIds) {
      const item = itemById.get(itemId);
      if (!item) continue;
      rawNodes.push({
        id: `item:${itemId}`,
        type: "materialItem",
        position: { x: 0, y: 0 },
        data: {
          item,
          root: itemId === rootItemId,
          onSelectItem,
        } satisfies MaterialItemNodeData,
      });
    }

    for (const recipeId of graph.recipeIds) {
      const recipe = recipeById.get(recipeId);
      if (!recipe) continue;
      rawNodes.push({
        id: `recipe:${recipeId}`,
        type: "materialRecipe",
        position: { x: 0, y: 0 },
        data: {
          recipe,
          itemById,
          onSelectItem,
        } satisfies MaterialRecipeNodeData,
      });
    }

    const rawEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
      },
      style: edge.cycle
        ? {
            strokeDasharray: "6 4",
            strokeWidth: 2,
          }
        : {
            strokeWidth: 1.5,
          },
      data: {
        direction: edge.cycle ? "backward" : "forward",
      },
    }));

    getLayoutedElements(rawNodes, rawEdges, "RIGHT", false)
      .then((layouted) => {
        if (stale) return;
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      })
      .finally(() => {
        if (!stale) setLayouting(false);
      });

    return () => {
      stale = true;
    };
  }, [
    graph,
    itemById,
    recipeById,
    rootItemId,
    onSelectItem,
  ]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t("dictionary.graphSummary", {
            items: graph.itemIds.size,
            recipes: graph.recipeIds.size,
            defaultValue:
              "{{items}} materials / {{recipes}} recipes",
          })}
        </span>

        {graph.hiddenTerminalRecipeIds.size > 0 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
            <PackageOpen className="h-3.5 w-3.5" />
            {t("dictionary.hiddenPackagingCount", {
              count: graph.hiddenTerminalRecipeIds.size,
              defaultValue: "{{count}} terminal packaging uses hidden",
            })}
          </span>
        )}

        {graph.truncated && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
            <CircleAlert className="h-3.5 w-3.5" />
            {t("dictionary.graphLimited", {
              defaultValue: "Large graph: expansion limit applied",
            })}
          </span>
        )}
      </div>

      <div className="h-[62vh] min-h-[520px] overflow-hidden rounded-2xl border bg-card">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18, minZoom: 0.12, maxZoom: 1 }}
          minZoom={0.08}
          maxZoom={1.7}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
          />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={2}
          />
          {layouting && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-sm text-muted-foreground backdrop-blur-[1px]">
              {t("dictionary.layouting", {
                defaultValue: "Arranging usage map…",
              })}
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
