export const PROCESS_FLOW_HIERARCHY_LAYOUTS = ["tree", "level_rows"] as const;
export type ProcessFlowHierarchyLayout = (typeof PROCESS_FLOW_HIERARCHY_LAYOUTS)[number];

export const PROCESS_FLOW_ARROW_ROUTINGS = ["straight", "elbow"] as const;
export type ProcessFlowArrowRouting = (typeof PROCESS_FLOW_ARROW_ROUTINGS)[number];

export const PROCESS_FLOW_ARROW_HEADS = ["filled", "open", "none"] as const;
export type ProcessFlowArrowHead = (typeof PROCESS_FLOW_ARROW_HEADS)[number];

/** How the chart image is sized in Print Preview / Print / Word. */
export const PROCESS_FLOW_PRINT_CHART_SIZES = ["fit_page", "full"] as const;
export type ProcessFlowPrintChartSize = (typeof PROCESS_FLOW_PRINT_CHART_SIZES)[number];

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
  /** Label font size inside process boxes (px on canvas). */
  box_font_size: number;
  /** full = readable multi-page; fit_page = shrink to one page */
  print_chart_size: ProcessFlowPrintChartSize;
};

/** Chart defaults at the standard 16px box font. */
const DEFAULT_BOX_FONT_SIZE = 16;
const DEFAULT_BOX_HEIGHT = 40;
const DEFAULT_MIN_BOX_WIDTH = 200;

/**
 * Derive box height / min width from font size, scaled from 200×40 at 16px.
 * Used when the font-size slider changes so boxes grow/shrink with the text.
 */
export function boxDimensionsForFontSize(fontSize: number): Pick<
  ProcessFlowChartSettings,
  "box_font_size" | "box_height" | "min_box_width"
> {
  const box_font_size = Math.max(10, Math.min(28, Math.round(fontSize)));
  const scale = box_font_size / DEFAULT_BOX_FONT_SIZE;
  const box_height = Math.round(
    Math.min(120, Math.max(28, DEFAULT_BOX_HEIGHT * scale)),
  );
  const min_box_width = Math.round(
    Math.min(400, Math.max(60, DEFAULT_MIN_BOX_WIDTH * scale)),
  );
  return { box_font_size, box_height, min_box_width };
}

/** Previous auto formula (font 16 → 160×76) — used only to migrate stored settings. */
function legacyBoxDimensionsForFontSize(fontSize: number): {
  box_height: number;
  min_box_width: number;
} {
  const box_font_size = Math.max(10, Math.min(28, Math.round(fontSize)));
  const lineHeight = box_font_size * 1.25;
  const padding = 16;
  const lines = box_font_size <= 14 ? 2 : 3;
  return {
    box_height: Math.round(Math.min(120, Math.max(40, padding + lines * lineHeight))),
    min_box_width: Math.round(Math.min(220, Math.max(110, box_font_size * 8.5 + 24))),
  };
}

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
  col_gap: 8,
  box_font_size: DEFAULT_BOX_FONT_SIZE,
  box_height: DEFAULT_BOX_HEIGHT,
  min_box_width: DEFAULT_MIN_BOX_WIDTH,
  print_chart_size: "fit_page",
};

export function parseProcessFlowChartSettings(raw: unknown): ProcessFlowChartSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROCESS_FLOW_CHART_SETTINGS };
  const r = raw as Record<string, unknown>;
  const layout = String(r.hierarchy_layout ?? "");
  const routing = String(r.arrow_routing ?? "");
  const head = String(r.arrow_head ?? "");
  const printSize = String(r.print_chart_size ?? "");
  const arrowWidth = Number(r.arrow_width);
  const boxStrokeWidth = Number(r.box_stroke_width);
  const rowGap = Number(r.row_gap);
  const colGap = Number(r.col_gap);
  const boxHeight = Number(r.box_height);
  const minBoxWidth = Number(r.min_box_width);
  const boxFontSize = Number(r.box_font_size);

  const parsed: ProcessFlowChartSettings = {
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
      Number.isFinite(colGap) && colGap >= 0 ? colGap : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.col_gap,
    box_height:
      Number.isFinite(boxHeight) && boxHeight >= 28
        ? boxHeight
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_height,
    min_box_width:
      Number.isFinite(minBoxWidth) && minBoxWidth >= 60
        ? minBoxWidth
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.min_box_width,
    box_font_size:
      Number.isFinite(boxFontSize) && boxFontSize >= 10 && boxFontSize <= 28
        ? Math.round(boxFontSize)
        : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.box_font_size,
    print_chart_size: PROCESS_FLOW_PRINT_CHART_SIZES.includes(printSize as ProcessFlowPrintChartSize)
      ? (printSize as ProcessFlowPrintChartSize)
      : DEFAULT_PROCESS_FLOW_CHART_SETTINGS.print_chart_size,
  };

  // Migrate previous auto-defaults (e.g. font 16 → 160×76) to the new 200×40 baseline.
  const legacy = legacyBoxDimensionsForFontSize(parsed.box_font_size);
  if (
    parsed.box_height === legacy.box_height &&
    parsed.min_box_width === legacy.min_box_width
  ) {
    const next = boxDimensionsForFontSize(parsed.box_font_size);
    parsed.box_height = next.box_height;
    parsed.min_box_width = next.min_box_width;
  }

  return parsed;
}
