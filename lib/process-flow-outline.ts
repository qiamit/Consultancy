import { createShapeId, type PlantLayoutShape } from "@/lib/plant-layout-canvas";
import {
  DEFAULT_PROCESS_FLOW_CHART_SETTINGS,
  PROCESS_FLOW_LEVEL_LABELS,
  type ProcessFlowChartSettings,
} from "@/lib/process-flow-chart-settings";

const PROCESS_FLOW_CANVAS_WIDTH = 1100;
const LAYOUT_START_X = 40;
const LAYOUT_START_Y = 40;
const MAX_BOX_WIDTH = 260;

export type ProcessFlowOutlineItem = {
  id: string;
  text: string;
  level: number;
};

export const PROCESS_FLOW_MAX_LEVEL = 49;

export { PROCESS_FLOW_LEVEL_LABELS };

export function createOutlineItemId(): string {
  return `outline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyOutlineItem(level = 0): ProcessFlowOutlineItem {
  return { id: createOutlineItemId(), text: "", level: clampLevel(level) };
}

export function defaultOutlineItems(): ProcessFlowOutlineItem[] {
  return [createEmptyOutlineItem(0)];
}

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(PROCESS_FLOW_MAX_LEVEL, Math.floor(level)));
}

export function hierarchyLabelForLevel(level: number): string {
  const clamped = clampLevel(level);
  if (clamped < PROCESS_FLOW_LEVEL_LABELS.length) {
    return PROCESS_FLOW_LEVEL_LABELS[clamped] ?? PROCESS_FLOW_LEVEL_LABELS[0];
  }
  return `Level ${clamped + 1}`;
}

type OutlineTreeNode = {
  item: ProcessFlowOutlineItem;
  children: OutlineTreeNode[];
};

type PositionedBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type LayoutMetrics = {
  boxes: PositionedBox[];
  width: number;
  maxY: number;
};

function buildOutlineTree(items: ProcessFlowOutlineItem[]): OutlineTreeNode[] {
  const roots: OutlineTreeNode[] = [];
  const stack: OutlineTreeNode[] = [];

  for (const item of items) {
    const node: OutlineTreeNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.item.level >= item.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1]!.children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

function treeDepth(node: OutlineTreeNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(treeDepth));
}

function maxTreeDepth(items: ProcessFlowOutlineItem[]): number {
  const roots = buildOutlineTree(items);
  if (roots.length === 0) return 1;
  return Math.max(...roots.map(treeDepth));
}

function groupItemsByLevel(items: ProcessFlowOutlineItem[]): Map<number, ProcessFlowOutlineItem[]> {
  const groups = new Map<number, ProcessFlowOutlineItem[]>();
  for (const item of items) {
    const level = clampLevel(item.level);
    const list = groups.get(level) ?? [];
    list.push(item);
    groups.set(level, list);
  }
  return groups;
}

function boxWidthForCount(count: number, settings: ProcessFlowChartSettings): number {
  if (count <= 0) return settings.min_box_width;
  const usable =
    PROCESS_FLOW_CANVAS_WIDTH - LAYOUT_START_X * 2 - settings.col_gap * (count - 1);
  return Math.max(
    settings.min_box_width,
    Math.min(MAX_BOX_WIDTH, Math.floor(usable / count)),
  );
}

function layoutTreeSubtree(
  node: OutlineTreeNode,
  depth: number,
  startX: number,
  settings: ProcessFlowChartSettings,
): LayoutMetrics {
  const boxWidth = settings.min_box_width;
  const boxHeight = settings.box_height;
  const y = LAYOUT_START_Y + depth * (boxHeight + settings.row_gap);

  if (node.children.length === 0) {
    return {
      boxes: [{ id: node.item.id, x: startX, y, width: boxWidth, height: boxHeight }],
      width: boxWidth,
      maxY: y + boxHeight,
    };
  }

  const childLayouts: LayoutMetrics[] = [];
  let childX = startX;
  for (const child of node.children) {
    const childLayout = layoutTreeSubtree(child, depth + 1, childX, settings);
    childLayouts.push(childLayout);
    childX += childLayout.width + settings.col_gap;
  }

  const childrenSpan =
    node.children.length > 0 ? childX - startX - settings.col_gap : boxWidth;
  const parentX = startX + Math.max(0, childrenSpan / 2 - boxWidth / 2);

  const boxes: PositionedBox[] = [
    { id: node.item.id, x: parentX, y, width: boxWidth, height: boxHeight },
    ...childLayouts.flatMap((layout) => layout.boxes),
  ];

  const maxY = Math.max(y + boxHeight, ...childLayouts.map((layout) => layout.maxY));
  const totalWidth = Math.max(boxWidth, childrenSpan);

  return { boxes, width: totalWidth, maxY };
}

function centerPositionsOnCanvas(positions: PositionedBox[]): PositionedBox[] {
  if (positions.length === 0) return positions;

  const minX = Math.min(...positions.map((pos) => pos.x));
  const maxX = Math.max(...positions.map((pos) => pos.x + pos.width));
  const contentWidth = maxX - minX;
  const offsetX = (PROCESS_FLOW_CANVAS_WIDTH - contentWidth) / 2 - minX;

  if (!Number.isFinite(offsetX) || Math.abs(offsetX) < 0.5) return positions;

  return positions.map((pos) => ({ ...pos, x: pos.x + offsetX }));
}

function layoutTreeForest(
  roots: OutlineTreeNode[],
  settings: ProcessFlowChartSettings,
): PositionedBox[] {
  const layouts: LayoutMetrics[] = [];
  let x = LAYOUT_START_X;

  for (const root of roots) {
    const layout = layoutTreeSubtree(root, 0, x, settings);
    layouts.push(layout);
    x += layout.width + settings.col_gap * 2;
  }

  return layouts.flatMap((layout) => layout.boxes);
}

function layoutLevelRows(
  items: ProcessFlowOutlineItem[],
  settings: ProcessFlowChartSettings,
): PositionedBox[] {
  const byLevel = groupItemsByLevel(items);
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const boxes: PositionedBox[] = [];
  let y = LAYOUT_START_Y;

  for (const level of levels) {
    const levelItems = byLevel.get(level) ?? [];
    if (levelItems.length === 0) continue;

    const boxWidth = boxWidthForCount(levelItems.length, settings);
    const rowWidth =
      levelItems.length * boxWidth + Math.max(0, levelItems.length - 1) * settings.col_gap;
    let x = Math.max(LAYOUT_START_X, (PROCESS_FLOW_CANVAS_WIDTH - rowWidth) / 2);

    for (const item of levelItems) {
      boxes.push({
        id: item.id,
        x,
        y,
        width: boxWidth,
        height: settings.box_height,
      });
      x += boxWidth + settings.col_gap;
    }

    y += settings.box_height + settings.row_gap;
  }

  return boxes;
}

function boxMapFromPositions(
  items: ProcessFlowOutlineItem[],
  positions: PositionedBox[],
): Map<string, PositionedBox> {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const map = new Map<string, PositionedBox>();
  for (const pos of positions) {
    if (itemById.has(pos.id)) map.set(pos.id, pos);
  }
  return map;
}

function buildParentChildPairs(items: ProcessFlowOutlineItem[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const stack: ProcessFlowOutlineItem[] = [];

  for (const item of items) {
    while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) {
      stack.pop();
    }
    if (stack.length > 0) {
      pairs.push([stack[stack.length - 1]!.id, item.id]);
    }
    stack.push(item);
  }

  return pairs;
}

function buildLevelRowArrows(
  positions: PositionedBox[],
  settings: ProcessFlowChartSettings,
): PlantLayoutShape[] {
  const rowTolerance = settings.box_height + settings.row_gap / 2;
  const rows: PositionedBox[][] = [];

  for (const box of positions) {
    const row = rows.find((group) => Math.abs(group[0]!.y - box.y) <= rowTolerance);
    if (row) row.push(box);
    else rows.push([box]);
  }

  rows.sort((a, b) => a[0]!.y - b[0]!.y);
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }

  const arrows: PlantLayoutShape[] = [];
  for (let rowIndex = 0; rowIndex < rows.length - 1; rowIndex += 1) {
    const upperRow = rows[rowIndex];
    const lowerRow = rows[rowIndex + 1];
    if (!upperRow?.length || !lowerRow?.length) continue;

    const arrowCount = Math.max(upperRow.length, lowerRow.length);
    for (let i = 0; i < arrowCount; i += 1) {
      const from = upperRow[Math.min(i, upperRow.length - 1)]!;
      const to = lowerRow[Math.min(i, lowerRow.length - 1)]!;
      arrows.push(
        createFlowArrow(
          from.x + from.width / 2,
          from.y + from.height + 4,
          to.x + to.width / 2,
          to.y - 4,
          settings,
        ),
      );
    }
  }

  return arrows;
}

function createFlowArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  settings: ProcessFlowChartSettings,
): PlantLayoutShape {
  if (y2 <= y1 && settings.arrow_routing === "straight") {
    return {
      id: createShapeId(),
      type: "arrow",
      x1,
      y1,
      x2,
      y2: y2 + 1,
      strokeColor: settings.arrow_color,
      strokeWidth: settings.arrow_width,
      dashed: settings.arrow_dashed,
      headStyle: settings.arrow_head,
      routing: settings.arrow_routing,
    };
  }

  return {
    id: createShapeId(),
    type: "arrow",
    x1,
    y1,
    x2,
    y2,
    strokeColor: settings.arrow_color,
    strokeWidth: settings.arrow_width,
    dashed: settings.arrow_dashed,
    headStyle: settings.arrow_head,
    routing: settings.arrow_routing,
  };
}

function buildTreeArrows(
  items: ProcessFlowOutlineItem[],
  boxById: Map<string, PositionedBox>,
  settings: ProcessFlowChartSettings,
): PlantLayoutShape[] {
  const pairs = buildParentChildPairs(items);
  const arrows: PlantLayoutShape[] = [];

  for (const [parentId, childId] of pairs) {
    const parent = boxById.get(parentId);
    const child = boxById.get(childId);
    if (!parent || !child) continue;

    arrows.push(
      createFlowArrow(
        parent.x + parent.width / 2,
        parent.y + parent.height + 4,
        child.x + child.width / 2,
        child.y - 4,
        settings,
      ),
    );
  }

  return arrows;
}

export function canvasHeightForOutline(
  items: ProcessFlowOutlineItem[],
  settings: ProcessFlowChartSettings = DEFAULT_PROCESS_FLOW_CHART_SETTINGS,
): number {
  const rows = items.length > 0 ? items : defaultOutlineItems();
  const minHeight = 780;
  const depth = maxTreeDepth(rows);
  const needed = LAYOUT_START_Y * 2 + depth * (settings.box_height + settings.row_gap);
  return Math.max(minHeight, needed);
}

export function parseOutlineItems(raw: unknown): ProcessFlowOutlineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProcessFlowOutlineItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    items.push({
      id: String(r.id ?? createOutlineItemId()),
      text: String(r.text ?? ""),
      level: clampLevel(Number(r.level)),
    });
  }
  return items;
}

export function outlineItemsFromShapes(shapes: PlantLayoutShape[]): ProcessFlowOutlineItem[] {
  const rectangles = shapes
    .filter((shape): shape is Extract<PlantLayoutShape, { type: "rectangle" }> => shape.type === "rectangle")
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (rectangles.length === 0) return [];

  const rowTolerance = DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_height + DEFAULT_PROCESS_FLOW_CHART_SETTINGS.row_gap / 2;
  const rows: (typeof rectangles)[] = [];
  for (const rect of rectangles) {
    const row = rows.find((group) => Math.abs(group[0].y - rect.y) <= rowTolerance);
    if (row) row.push(rect);
    else rows.push([rect]);
  }

  rows.sort((a, b) => a[0].y - b[0].y);
  const items: ProcessFlowOutlineItem[] = [];

  rows.forEach((row, rowIndex) => {
    const level = clampLevel(rowIndex);
    row.sort((a, b) => a.x - b.x);
    for (const shape of row) {
      let inferredLevel = level;
      if (shape.hierarchyType) {
        const idx = PROCESS_FLOW_LEVEL_LABELS.indexOf(
          shape.hierarchyType as (typeof PROCESS_FLOW_LEVEL_LABELS)[number],
        );
        if (idx >= 0) inferredLevel = idx;
      }
      items.push({
        id: shape.id,
        text: shape.label,
        level: inferredLevel,
      });
    }
  });

  return items;
}

export function buildShapesFromOutline(
  items: ProcessFlowOutlineItem[],
  existingShapes: PlantLayoutShape[] = [],
  settings: ProcessFlowChartSettings = DEFAULT_PROCESS_FLOW_CHART_SETTINGS,
): PlantLayoutShape[] {
  const legacy = existingShapes.filter((shape) => shape.type === "legacy");
  const rows = items.length > 0 ? items : defaultOutlineItems();
  const itemById = new Map(rows.map((item) => [item.id, item]));

  const positions = centerPositionsOnCanvas(
    settings.hierarchy_layout === "level_rows"
      ? layoutLevelRows(rows, settings)
      : layoutTreeForest(buildOutlineTree(rows), settings),
  );

  const boxById = boxMapFromPositions(rows, positions);

  const rectangles: PlantLayoutShape[] = positions.map((pos) => {
    const item = itemById.get(pos.id);
    return {
      id: pos.id,
      type: "rectangle",
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      strokeColor: settings.box_stroke_color,
      strokeWidth: settings.box_stroke_width,
      label: item?.text.trim() ?? "",
      hierarchyType: hierarchyLabelForLevel(item?.level ?? 0),
    };
  });

  const arrows =
    settings.hierarchy_layout === "level_rows"
      ? buildLevelRowArrows(positions, settings)
      : buildTreeArrows(rows, boxById, settings);

  return [...legacy, ...arrows, ...rectangles];
}

export function insertOutlineRowAfter(
  items: ProcessFlowOutlineItem[],
  index: number,
): ProcessFlowOutlineItem[] {
  const current = items[index] ?? createEmptyOutlineItem(0);
  const next = createEmptyOutlineItem(current.level);
  return [...items.slice(0, index + 1), next, ...items.slice(index + 1)];
}

export function updateOutlineRowLevel(
  items: ProcessFlowOutlineItem[],
  index: number,
  delta: number,
): ProcessFlowOutlineItem[] {
  return items.map((item, i) =>
    i === index ? { ...item, level: clampLevel(item.level + delta) } : item,
  );
}

export function removeOutlineRow(items: ProcessFlowOutlineItem[], index: number): ProcessFlowOutlineItem[] {
  if (items.length <= 1) {
    return [createEmptyOutlineItem(0)];
  }
  return items.filter((_, i) => i !== index);
}
