export const PROCESS_FLOW_HIERARCHY_LAYOUTS = ["tree", "level_rows"] as const;
export type ProcessFlowHierarchyLayout = (typeof PROCESS_FLOW_HIERARCHY_LAYOUTS)[number];

export const PROCESS_FLOW_ARROW_ROUTINGS = ["straight", "elbow"] as const;
export type ProcessFlowArrowRouting = (typeof PROCESS_FLOW_ARROW_ROUTINGS)[number];

export const PROCESS_FLOW_ARROW_HEADS = ["filled", "open", "none"] as const;
export type ProcessFlowArrowHead = (typeof PROCESS_FLOW_ARROW_HEADS)[number];

export const PROCESS_FLOW_LEVEL_LABELS = [
  "Level 1 - Main Process",
  "Level 2 - Sub Process",
  "Level 3 - Operation",
  "Level 4 - Step / Activity",
  "Input / Raw Material",
  "Output / Finished Goods",
  "Inspection / QC",
] as const;

export type ProcessFlowChartSettings = {
  hierarchy_layout: ProcessFlowHierarchyLayout;
  arrow_routing: ProcessFlowArrowRouting;
  arrow_head: ProcessFlowArrowHead;
  arrow_color: string;
  arrow_width: number;
  arrow_dashed: boolean;
  box_stroke_color: string;
  box_stroke_width: number;
  row_gap: number;
  col_gap: number;
  box_height: number;
  min_box_width: number;
};

export const DEFAULT_PROCESS_FLOW_CHART_SETTINGS: ProcessFlowChartSettings = {
  hierarchy_layout: "tree",
  arrow_routing: "elbow",
  arrow_head: "filled",
  arrow_color: "#374151",
  arrow_width: 2,
  arrow_dashed: false,
  box_stroke_color: "#111827",
  box_stroke_width: 2,
  row_gap: 28,
  col_gap: 16,
  box_height: 54,
  min_box_width: 130,
};

export function parseProcessFlowChartSettings(raw: unknown): ProcessFlowChartSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROCESS_FLOW_CHART_SETTINGS };
  const r = raw as Record<string, unknown>;
  const layout = String(r.hierarchy_layout ?? "");
  const routing = String(r.arrow_routing ?? "");
  const head = String(r.arrow_head ?? "");
  const arrowWidth = Number(r.arrow_width);
  const boxStrokeWidth = Number(r.box_stroke_width);
  const rowGap = Number(r.row_gap);
  const colGap = Number(r.col_gap);
  const boxHeight = Number(r.box_height);
  const minBoxWidth = Number(r.min_box_width);

  return {
    hierarchy_layout: PROCESS_FLOW_HIERARCHY_LAYOUTS.includes(layout as ProcessFlowHierarchyLayout)
      ? (layout as ProcessFlowHierarchyLayout)
      : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.hierarchy_layout,
    arrow_routing: PROCESS_FLOW_ARROW_ROUTINGS.includes(routing as ProcessFlowArrowRouting)
      ? (routing as ProcessFlowArrowRouting)
      : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.arrow_routing,
    arrow_head: PROCESS_FLOW_ARROW_HEADS.includes(head as ProcessFlowArrowHead)
      ? (head as ProcessFlowArrowHead)
      : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.arrow_head,
    arrow_color:
      String(r.arrow_color ?? DEFAULT_PROCESS_FLOW_CHART_SETTINGS.arrow_color).trim() ||
      DEFAULT_PROCESS_FLOW_CHART_SETTINGS.arrow_color,
    arrow_width:
      Number.isFinite(arrowWidth) && arrowWidth > 0
        ? arrowWidth
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.arrow_width,
    arrow_dashed: Boolean(r.arrow_dashed),
    box_stroke_color:
      String(r.box_stroke_color ?? DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_stroke_color).trim() ||
      DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_stroke_color,
    box_stroke_width:
      Number.isFinite(boxStrokeWidth) && boxStrokeWidth > 0
        ? boxStrokeWidth
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_stroke_width,
    row_gap:
      Number.isFinite(rowGap) && rowGap >= 8 ? rowGap : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.row_gap,
    col_gap:
      Number.isFinite(colGap) && colGap >= 4 ? colGap : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.col_gap,
    box_height:
      Number.isFinite(boxHeight) && boxHeight >= 32
        ? boxHeight
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_height,
    min_box_width:
      Number.isFinite(minBoxWidth) && minBoxWidth >= 80
        ? minBoxWidth
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.min_box_width,
  };
}
