import {
  parsePlantLayoutShapes,
  shapesFromLegacyImage,
  type PlantLayoutShape,
} from "@backend/modules/bis/plant-layout-canvas";
import {
  defaultOutlineItems,
  outlineItemsFromShapes,
  parseOutlineItems,
  type ProcessFlowOutlineItem,
} from "@backend/modules/bis/process-flow-outline";
import {
  DEFAULT_PROCESS_FLOW_CHART_SETTINGS,
  parseProcessFlowChartSettings,
  type ProcessFlowChartSettings,
} from "@backend/modules/bis/process-flow-chart-settings";

export {
  PROCESS_FLOW_HIERARCHY_LAYOUTS,
  PROCESS_FLOW_ARROW_ROUTINGS,
  PROCESS_FLOW_ARROW_HEADS,
  PROCESS_FLOW_LEVEL_LABELS,
  DEFAULT_PROCESS_FLOW_CHART_SETTINGS,
  type ProcessFlowHierarchyLayout,
  type ProcessFlowArrowRouting,
  type ProcessFlowArrowHead,
  type ProcessFlowChartSettings,
} from "@backend/modules/bis/process-flow-chart-settings";

export const PROCESS_FLOW_HIERARCHY_TYPES = [
  "Level 1 - Main Process",
  "Level 2 - Sub Process",
  "Level 3 - Operation",
  "Level 4 - Step / Activity",
  "Input / Raw Material",
  "Output / Finished Goods",
  "Inspection / QC",
] as const;

export type ProcessFlowHierarchyType = (typeof PROCESS_FLOW_HIERARCHY_TYPES)[number];

export const DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE: ProcessFlowHierarchyType =
  PROCESS_FLOW_HIERARCHY_TYPES[1];

export type ProcessFlowChartStored = {
  drawing_data_url: string;
  brush_size: number;
  stroke_color: string;
  shapes: PlantLayoutShape[];
  outline_items: ProcessFlowOutlineItem[];
  chart_settings: ProcessFlowChartSettings;
};

export function defaultProcessFlowChartDocument(): ProcessFlowChartStored {
  return {
    drawing_data_url: "",
    brush_size: 2,
    stroke_color: "#111827",
    shapes: [],
    outline_items: defaultOutlineItems(),
    chart_settings: { ...DEFAULT_PROCESS_FLOW_CHART_SETTINGS },
  };
}

export function documentHasContent(doc: ProcessFlowChartStored): boolean {
  return (
    doc.drawing_data_url.trim().length > 0 ||
    doc.shapes.length > 0 ||
    doc.outline_items.some((item) => item.text.trim().length > 0)
  );
}

export function parseProcessFlowChart(raw: unknown): ProcessFlowChartStored {
  if (!raw || typeof raw !== "object") return defaultProcessFlowChartDocument();
  const r = raw as Record<string, unknown>;
  const brush = Number(r.brush_size);
  const drawing_data_url = String(r.drawing_data_url ?? "").trim();
  let shapes = parsePlantLayoutShapes(r.shapes);
  if (shapes.length === 0 && drawing_data_url) {
    shapes = shapesFromLegacyImage(drawing_data_url);
  }

  let outline_items = parseOutlineItems(r.outline_items);
  if (outline_items.length === 0) {
    const fromShapes = outlineItemsFromShapes(shapes);
    outline_items = fromShapes.length > 0 ? fromShapes : defaultOutlineItems();
  }

  return {
    drawing_data_url,
    brush_size: Number.isFinite(brush) && brush > 0 ? brush : 2,
    stroke_color: String(r.stroke_color ?? "#111827").trim() || "#111827",
    shapes,
    outline_items,
    chart_settings: parseProcessFlowChartSettings(r.chart_settings),
  };
}

export const PROCESS_FLOW_CHART_CANVAS_WIDTH = 1100;
export const PROCESS_FLOW_CHART_CANVAS_HEIGHT = 780;

export const PROCESS_FLOW_BOX_STROKE_WIDTH = 2;
export const PROCESS_FLOW_BOX_STROKE_COLOR = "#111827";

export type { PlantLayoutShape } from "@backend/modules/bis/plant-layout-canvas";
export type { ProcessFlowOutlineItem } from "@backend/modules/bis/process-flow-outline";
