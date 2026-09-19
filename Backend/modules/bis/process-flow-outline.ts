import { createShapeId, type PlantLayoutShape } from "@backend/modules/bis/plant-layout-canvas";
import {
  DEFAULT_PROCESS_FLOW_CHART_SETTINGS,
  PROCESS_FLOW_LEVEL_LABELS,
  type ProcessFlowChartSettings,
} from "@backend/modules/bis/process-flow-chart-settings";

const PROCESS_FLOW_CANVAS_WIDTH = 1100;
const LAYOUT_START_X = 40;
const LAYOUT_START_Y = 40;
const MAX_BOX_WIDTH = 260;

export type ProcessFlowOutlineItem = {
  id: string;
  text: string;
  level: number;
  /** Optional per-box width (px). Omit / 0 = use Chart Settings min width. */
  box_width?: number;
  /** Optional per-box height (px). Omit / 0 = use Chart Settings box height. */
  box_height?: number;
  /** Manual drag offset from auto layout (px). */
  offset_x?: number;
  offset_y?: number;
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

export function clampBoxWidth(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(60, Math.min(400, Math.round(value)));
}

export function clampBoxHeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(28, Math.min(200, Math.round(value)));
}

export function clampBoxOffset(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function applyItemOffsets(
  positions: PositionedBox[],
  itemById: Map<string, ProcessFlowOutlineItem>,
): PositionedBox[] {
  return positions.map((pos) => {
    const item = itemById.get(pos.id);
    const ox = item?.offset_x ?? 0;
    const oy = item?.offset_y ?? 0;
    if (!ox && !oy) return pos;
    return {
      ...pos,
      x: pos.x + ox,
      y: Math.max(0, pos.y + oy),
    };
  });
}

export function hierarchyLabelForLevel(level: number): string {
  const clamped = clampLevel(level);
  if (clamped < PROCESS_FLOW_LEVEL_LABELS.length) {
    return PROCESS_FLOW_LEVEL_LABELS[clamped] ?? PROCESS_FLOW_LEVEL_LABELS[0];
  }
  return `Level ${clamped + 1}`;
}

function boxSizeForItem(
  item: ProcessFlowOutlineItem,
  settings: ProcessFlowChartSettings,
): { width: number; height: number } {
  const width =
    typeof item.box_width === "number" && item.box_width > 0
      ? clampBoxWidth(item.box_width)
      : settings.min_box_width;
  const height =
    typeof item.box_height === "number" && item.box_height > 0
      ? clampBoxHeight(item.box_height)
      : settings.box_height;
  return { width, height };
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
  // Keep boxes at configured width so Column gap is the real spacing (do not stretch to fill canvas).
  const usable =
    PROCESS_FLOW_CANVAS_WIDTH - LAYOUT_START_X * 2 - settings.col_gap * Math.max(0, count - 1);
  const maxPerBox = Math.floor(usable / Math.max(1, count));
  return Math.max(
    80,
    Math.min(settings.min_box_width, MAX_BOX_WIDTH, Math.max(80, maxPerBox)),
  );
}

function boxesVerticallyOverlap(a: PositionedBox, b: PositionedBox): boolean {
  return a.y < b.y + b.height && b.y < a.y + a.height;
}

/** True when two boxes share a vertical band and are closer than `gap` horizontally. */
function boxesNeedHorizontalGap(a: PositionedBox, b: PositionedBox, gap: number): boolean {
  if (!boxesVerticallyOverlap(a, b)) return false;
  return !(a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x);
}

function findRootBox(layout: LayoutMetrics, rootId: string): PositionedBox | null {
  return layout.boxes.find((box) => box.id === rootId) ?? layout.boxes[0] ?? null;
}

/**
 * Pack sibling subtrees so consecutive ROOT boxes are exactly Column Gap apart
 * (using each root's own width), then push further only if descendant boxes collide.
 */
function packSiblingLayouts(
  layouts: LayoutMetrics[],
  rootIds: string[],
  colGap: number,
): LayoutMetrics[] {
  const placed: Array<LayoutMetrics & { rootId: string }> = [];

  layouts.forEach((layout, index) => {
    const rootId = rootIds[index] ?? layout.boxes[0]?.id ?? "";
    const root = findRootBox(layout, rootId);
    if (!root) {
      placed.push({ ...layout, rootId });
      return;
    }

    let shift = 0;
    const prev = placed[placed.length - 1];
    if (prev) {
      const prevRoot = findRootBox(prev, prev.rootId);
      if (prevRoot) {
        const targetRootX = prevRoot.x + prevRoot.width + colGap;
        shift = targetRootX - root.x;
      }
    }

    for (let guard = 0; guard < 80; guard += 1) {
      let push = 0;
      const trial = layout.boxes.map((box) => ({ ...box, x: box.x + shift }));
      for (const trialBox of trial) {
        for (const prevLayout of placed) {
          for (const prevBox of prevLayout.boxes) {
            if (!boxesNeedHorizontalGap(trialBox, prevBox, colGap)) continue;
            push = Math.max(push, prevBox.x + prevBox.width + colGap - trialBox.x);
          }
        }
      }
      if (push <= 0) break;
      shift += push;
    }

    const boxes = layout.boxes.map((box) => ({ ...box, x: box.x + shift }));
    const minX = Math.min(...boxes.map((box) => box.x));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    placed.push({
      boxes,
      width: Math.max(0, maxX - minX),
      maxY: Math.max(layout.maxY, ...boxes.map((box) => box.y + box.height)),
      rootId,
    });
  });

  return placed.map(({ boxes, width, maxY }) => ({ boxes, width, maxY }));
}

function layoutTreeSubtree(
  node: OutlineTreeNode,
  startX: number,
  startY: number,
  settings: ProcessFlowChartSettings,
): LayoutMetrics {
  const { width: boxWidth, height: boxHeight } = boxSizeForItem(node.item, settings);
  const y = startY;

  if (node.children.length === 0) {
    return {
      boxes: [{ id: node.item.id, x: startX, y, width: boxWidth, height: boxHeight }],
      width: boxWidth,
      maxY: y + boxHeight,
    };
  }

  const childStartY = y + boxHeight + settings.row_gap;
  const localChildren = node.children.map((child) =>
    layoutTreeSubtree(child, 0, childStartY, settings),
  );
  const packedChildren = packSiblingLayouts(
    localChildren,
    node.children.map((child) => child.item.id),
    settings.col_gap,
  );

  const allChildBoxes = packedChildren.flatMap((layout) => layout.boxes);
  const minChildX = Math.min(...allChildBoxes.map((box) => box.x));
  const maxChildX = Math.max(...allChildBoxes.map((box) => box.x + box.width));
  const dx = startX - minChildX;
  const childBoxes = allChildBoxes.map((box) => ({ ...box, x: box.x + dx }));

  const childRoots = node.children
    .map((child) => childBoxes.find((box) => box.id === child.item.id))
    .filter((box): box is PositionedBox => Boolean(box));
  const rootLeft = childRoots.length
    ? Math.min(...childRoots.map((box) => box.x))
    : Math.min(...childBoxes.map((box) => box.x));
  const rootRight = childRoots.length
    ? Math.max(...childRoots.map((box) => box.x + box.width))
    : Math.max(...childBoxes.map((box) => box.x + box.width));
  const rootSpan = rootRight - rootLeft;
  const parentX = rootLeft + Math.max(0, rootSpan / 2 - boxWidth / 2);

  const boxes: PositionedBox[] = [
    { id: node.item.id, x: parentX, y, width: boxWidth, height: boxHeight },
    ...childBoxes,
  ];

  const maxY = Math.max(y + boxHeight, ...packedChildren.map((layout) => layout.maxY));
  const totalWidth = Math.max(boxWidth, maxChildX + dx - (minChildX + dx));

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
  const localLayouts = roots.map((root) =>
    layoutTreeSubtree(root, 0, LAYOUT_START_Y, settings),
  );
  const packed = packSiblingLayouts(
    localLayouts,
    roots.map((root) => root.item.id),
    settings.col_gap,
  );
  const allBoxes = packed.flatMap((layout) => layout.boxes);
  if (allBoxes.length === 0) return [];

  const minX = Math.min(...allBoxes.map((box) => box.x));
  const dx = LAYOUT_START_X - minX;
  return allBoxes.map((box) => ({ ...box, x: box.x + dx }));
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

    const sizes = levelItems.map((item) => boxSizeForItem(item, settings));
    const rowHeight = Math.max(settings.box_height, ...sizes.map((s) => s.height));
    const defaultWidth = boxWidthForCount(levelItems.length, settings);
    const widths = sizes.map((s, i) =>
      levelItems[i]!.box_width && levelItems[i]!.box_width! > 0 ? s.width : defaultWidth,
    );
    const rowWidth =
      widths.reduce((sum, w) => sum + w, 0) +
      Math.max(0, levelItems.length - 1) * settings.col_gap;
    let x = Math.max(LAYOUT_START_X, (PROCESS_FLOW_CANVAS_WIDTH - rowWidth) / 2);

    for (let i = 0; i < levelItems.length; i += 1) {
      const item = levelItems[i]!;
      const size = sizes[i]!;
      const width = widths[i]!;
      boxes.push({
        id: item.id,
        x,
        y,
        width,
        height: size.height,
      });
      x += width + settings.col_gap;
    }

    y += rowHeight + settings.row_gap;
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
  const itemById = new Map(rows.map((item) => [item.id, item]));
  const positions = applyItemOffsets(
    centerPositionsOnCanvas(
      settings.hierarchy_layout === "level_rows"
        ? layoutLevelRows(rows, settings)
        : layoutTreeForest(buildOutlineTree(rows), settings),
    ),
    itemById,
  );
  const maxY = positions.reduce((highest, pos) => Math.max(highest, pos.y + pos.height), 0);
  // Tight to content (+ small bottom padding). Avoid forcing a huge empty grid.
  return Math.max(200, Math.ceil(maxY + 24));
}

export function parseOutlineItems(raw: unknown): ProcessFlowOutlineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProcessFlowOutlineItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const widthRaw = Number(r.box_width);
    const heightRaw = Number(r.box_height);
    const offsetXRaw = Number(r.offset_x);
    const offsetYRaw = Number(r.offset_y);
    const item: ProcessFlowOutlineItem = {
      id: String(r.id ?? createOutlineItemId()),
      text: String(r.text ?? ""),
      level: clampLevel(Number(r.level)),
    };
    if (Number.isFinite(widthRaw) && widthRaw > 0) item.box_width = clampBoxWidth(widthRaw);
    if (Number.isFinite(heightRaw) && heightRaw > 0) item.box_height = clampBoxHeight(heightRaw);
    if (Number.isFinite(offsetXRaw) && offsetXRaw !== 0) item.offset_x = clampBoxOffset(offsetXRaw);
    if (Number.isFinite(offsetYRaw) && offsetYRaw !== 0) item.offset_y = clampBoxOffset(offsetYRaw);
    items.push(item);
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
        box_width: shape.width > 0 ? clampBoxWidth(shape.width) : undefined,
        box_height: shape.height > 0 ? clampBoxHeight(shape.height) : undefined,
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

  const positions = applyItemOffsets(
    centerPositionsOnCanvas(
      settings.hierarchy_layout === "level_rows"
        ? layoutLevelRows(rows, settings)
        : layoutTreeForest(buildOutlineTree(rows), settings),
    ),
    itemById,
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
      fontSize: settings.box_font_size,
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
