import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  Factory,
  Package,
  Pickaxe,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { usePortrait } from "@/hooks/usePortrait";
import { getFacilityName, getItemName, getRecipeName } from "@/lib/i18n-helpers";
import { getLayoutedElements } from "@/lib/layout";
import type { RequirementTreeNode } from "@/lib/material-dictionary";
import type { Facility, Item, ItemId, Recipe, RecipeId } from "@/types";
import { cn } from "@/lib/utils";

type FlowOrientation = "horizontal" | "vertical";

interface ItemNodeData extends Record<string, unknown> {
  kind: "item";
  itemId: ItemId;
  item?: Item;
  amount: number;
  root: boolean;
  cycle: boolean;
  depthLimited: boolean;
  nodeLimited: boolean;
  orientation: FlowOrientation;
  onSelectItem: (itemId: ItemId) => void;
}

interface RecipeNodeData extends Record<string, unknown> {
  kind: "recipe";
  recipeId: RecipeId;
  recipe?: Recipe;
  facility?: Facility;
  alternativeIndex: number;
  alternativeCount: number;
  orientation: FlowOrientation;
}

type ItemFlowNode = Node<ItemNodeData, "dictionaryItem">;
type RecipeFlowNode = Node<RecipeNodeData, "dictionaryRecipe">;
type DictionaryFlowNode = ItemFlowNode | RecipeFlowNode;

function formatAmount(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(3)));
}

function FlowHandles({ orientation }: { orientation: FlowOrientation }) {
  const vertical = orientation === "vertical";
  return (
    <>
      <Handle
        type="target"
        position={vertical ? Position.Top : Position.Left}
        className="!h-2 !w-2 !border-0 !bg-foreground/45"
      />
      <Handle
        type="source"
        position={vertical ? Position.Bottom : Position.Right}
        className="!h-2 !w-2 !border-0 !bg-foreground/45"
      />
    </>
  );
}

function DictionaryItemNode({
  data,
  selected,
}: NodeProps<ItemFlowNode>) {
  const { t } = useTranslation("app");
  const stopReason = data.cycle
    ? t("dictionary.requirementCycle", {
        defaultValue: "Cycle detected — expansion stopped",
      })
    : data.depthLimited
      ? t("dictionary.requirementDepthLimit", {
          defaultValue: "Depth limit reached",
        })
      : data.nodeLimited
        ? t("dictionary.requirementNodeLimit", {
            defaultValue: "Tree size limit reached",
          })
        : null;

  return (
    <div
      className={cn(
        "endfield-dictionary-flow-item w-[156px] border bg-card",
        data.root && "border-primary",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <FlowHandles orientation={data.orientation} />
      <button
        type="button"
        onClick={() => data.onSelectItem(data.itemId)}
        className="flex min-h-[72px] w-full items-center gap-2 p-2 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border bg-background">
          {data.item?.iconUrl ? (
            <img
              src={data.item.iconUrl}
              alt=""
              className="h-8 w-8 object-contain"
              loading="lazy"
            />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            {data.root
              ? t("dictionary.flowTarget", { defaultValue: "Target" })
              : t("dictionary.flowMaterial", { defaultValue: "Material" })}
          </span>
          <span className="mt-0.5 block truncate text-xs font-bold">
            {data.item ? getItemName(data.item) : data.itemId}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            {data.root ? (
              <Factory className="h-3 w-3" />
            ) : (
              <Pickaxe className="h-3 w-3" />
            )}
            {data.root
              ? t("dictionary.flowTargetAmount", {
                  amount: formatAmount(data.amount),
                  defaultValue: "Target ×{{amount}}",
                })
              : t("dictionary.flowRequiredAmount", {
                  amount: formatAmount(data.amount),
                  defaultValue: "Required ×{{amount}}",
                })}
          </span>
        </span>
      </button>
      {stopReason && (
        <div className="flex items-start gap-1.5 border-t px-2.5 py-1.5 text-[9px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{stopReason}</span>
        </div>
      )}
    </div>
  );
}

function DictionaryRecipeNode({ data }: NodeProps<RecipeFlowNode>) {
  const { t } = useTranslation("app");
  const recipeName = data.recipe
    ? getRecipeName(data.recipe)
    : data.recipeId;
  const facilityName = data.facility
    ? getFacilityName(data.facility)
    : data.recipe?.facilityId;

  return (
    <div className="endfield-dictionary-flow-recipe w-[124px] border border-dashed bg-background p-2">
      <FlowHandles orientation={data.orientation} />
      <div className="flex items-start gap-2">
        <Factory className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            {data.alternativeCount > 1
              ? t("dictionary.requirementAlternative", {
                  index: data.alternativeIndex + 1,
                  defaultValue: "Alternative {{index}}",
                })
              : t("dictionary.flowProcess", { defaultValue: "Process" })}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-tight">
            {recipeName}
          </div>
          <div className="mt-1 text-[8px] leading-snug text-muted-foreground">
            {facilityName ?? "—"}
            {data.recipe ? ` · ${data.recipe.craftingTime}s` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  dictionaryItem: DictionaryItemNode,
  dictionaryRecipe: DictionaryRecipeNode,
};

function buildFlowElements(
  tree: RequirementTreeNode,
  itemById: ReadonlyMap<ItemId, Item>,
  recipeById: ReadonlyMap<RecipeId, Recipe>,
  facilityById: ReadonlyMap<Facility["id"], Facility>,
  orientation: FlowOrientation,
  onSelectItem: (itemId: ItemId) => void,
): { nodes: DictionaryFlowNode[]; edges: Edge[] } {
  const nodes: DictionaryFlowNode[] = [];
  const edges: Edge[] = [];
  let edgeCounter = 0;

  const visitItem = (
    node: RequirementTreeNode,
    path: string,
    root: boolean,
  ): string => {
    const itemNodeId = `item:${path}`;
    nodes.push({
      id: itemNodeId,
      type: "dictionaryItem",
      position: { x: 0, y: 0 },
      data: {
        kind: "item",
        itemId: node.itemId,
        item: itemById.get(node.itemId),
        amount: node.amount,
        root,
        cycle: node.cycle,
        depthLimited: node.depthLimited,
        nodeLimited: node.nodeLimited,
        orientation,
        onSelectItem,
      },
    });

    node.recipes.forEach((branch, recipeIndex) => {
      const recipeNodeId = `recipe:${path}:${recipeIndex}:${branch.recipeId}`;
      const recipe = recipeById.get(branch.recipeId);
      nodes.push({
        id: recipeNodeId,
        type: "dictionaryRecipe",
        position: { x: 0, y: 0 },
        data: {
          kind: "recipe",
          recipeId: branch.recipeId,
          recipe,
          facility: recipe ? facilityById.get(recipe.facilityId) : undefined,
          alternativeIndex: recipeIndex,
          alternativeCount: node.recipes.length,
          orientation,
        },
      });

      edges.push({
        id: `edge:${edgeCounter++}`,
        source: recipeNodeId,
        target: itemNodeId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      });

      branch.inputs.forEach((input, inputIndex) => {
        const inputNodeId = visitItem(
          input,
          `${path}/r${recipeIndex}/i${inputIndex}`,
          false,
        );
        edges.push({
          id: `edge:${edgeCounter++}`,
          source: inputNodeId,
          target: recipeNodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      });
    });

    return itemNodeId;
  };

  visitItem(tree, "root", true);
  return { nodes, edges };
}

type DictionaryProductionFlowProps = {
  tree: RequirementTreeNode;
  itemById: ReadonlyMap<ItemId, Item>;
  recipeById: ReadonlyMap<RecipeId, Recipe>;
  facilityById: ReadonlyMap<Facility["id"], Facility>;
  onSelectItem: (itemId: ItemId) => void;
};

export default function DictionaryProductionFlow({
  tree,
  itemById,
  recipeById,
  facilityById,
  onSelectItem,
}: DictionaryProductionFlowProps) {
  const { t } = useTranslation("app");
  const isPortrait = usePortrait();
  const orientation: FlowOrientation = isPortrait ? "vertical" : "horizontal";
  const direction = isPortrait ? "DOWN" : "RIGHT";
  const instanceRef =
    useRef<ReactFlowInstance<DictionaryFlowNode, Edge> | null>(null);
  const [nodes, setNodes] = useState<DictionaryFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutReady, setLayoutReady] = useState(false);

  const rawGraph = useMemo(
    () =>
      buildFlowElements(
        tree,
        itemById,
        recipeById,
        facilityById,
        orientation,
        onSelectItem,
      ),
    [
      tree,
      itemById,
      recipeById,
      facilityById,
      orientation,
      onSelectItem,
    ],
  );

  useEffect(() => {
    let active = true;
    setLayoutReady(false);

    void getLayoutedElements(
      rawGraph.nodes,
      rawGraph.edges,
      direction,
      false,
      "interactive",
      {
        layerGap: isPortrait ? 74 : 96,
        nodeGap: isPortrait ? 44 : 54,
        padding: 28,
      },
    ).then((layouted) => {
      if (!active) return;
      setNodes(layouted.nodes as DictionaryFlowNode[]);
      setEdges(layouted.edges);
      setLayoutReady(true);
    });

    return () => {
      active = false;
    };
  }, [rawGraph, direction, isPortrait]);

  const graphCounts = useMemo(() => {
    let materials = 0;
    let processes = 0;
    for (const node of rawGraph.nodes) {
      if (node.type === "dictionaryItem") materials += 1;
      if (node.type === "dictionaryRecipe") processes += 1;
    }
    return { materials, processes };
  }, [rawGraph.nodes]);

  const fitGraph = useCallback(() => {
    void instanceRef.current?.fitView({
      padding: isPortrait ? 0.12 : 0.18,
      minZoom: 0.2,
      maxZoom: 1.15,
      duration: 250,
    });
  }, [isPortrait]);

  useLayoutEffect(() => {
    if (!layoutReady || nodes.length === 0) return;
    const frame = requestAnimationFrame(fitGraph);
    return () => cancelAnimationFrame(frame);
  }, [layoutReady, nodes, fitGraph]);

  return (
    <div className="endfield-dictionary-production-flow flex h-full min-h-[520px] flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-muted/25 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 shrink-0" />
            <h2 className="text-sm font-bold">
              {t("dictionary.productionFlowTitle", {
                defaultValue: "Production flow",
              })}
            </h2>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {t("dictionary.productionFlowDescription", {
              defaultValue:
                "All required inputs are connected from raw materials to the selected product. Alternative recipes branch separately.",
            })}
          </p>
        </div>
        <span className="shrink-0 text-right text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t("dictionary.productionFlowSummary", {
            materials: graphCounts.materials,
            processes: graphCounts.processes,
            defaultValue:
              "{{materials}} materials · {{processes}} processes",
          })}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        {!layoutReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-xs text-muted-foreground">
            {t("dictionary.productionFlowArranging", {
              defaultValue: "Arranging flow…",
            })}
          </div>
        )}
        <ReactFlow<DictionaryFlowNode, Edge>
          className="flow-theme"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            instanceRef.current = instance;
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnPinch
          fitView={false}
          minZoom={0.15}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={14} size={1} />
          <Controls
            showInteractive={false}
            className="flow-controls"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 0,
              boxShadow: "none",
              overflow: "hidden",
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
