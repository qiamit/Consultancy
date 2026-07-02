import {
  parsePlantLayoutShapes,
  shapesFromLegacyImage,
  type PlantLayoutShape,
} from "@/lib/plant-layout-canvas";

export type PlantLayoutTool = "draw" | "select";

export type PlantLayoutStored = {
  drawing_data_url: string;
  brush_size: number;
  stroke_color: string;
  shapes: PlantLayoutShape[];
};

export function defaultPlantLayoutDocument(): PlantLayoutStored {
  return {
    drawing_data_url: "",
    brush_size: 2,
    stroke_color: "#111827",
    shapes: [],
  };
}

export function documentHasContent(doc: PlantLayoutStored): boolean {
  return doc.drawing_data_url.trim().length > 0 || doc.shapes.length > 0;
}

export function parsePlantLayout(raw: unknown): PlantLayoutStored {
  if (!raw || typeof raw !== "object") return defaultPlantLayoutDocument();
  const r = raw as Record<string, unknown>;
  const brush = Number(r.brush_size);
  const drawing_data_url = String(r.drawing_data_url ?? "").trim();
  let shapes = parsePlantLayoutShapes(r.shapes);
  if (shapes.length === 0 && drawing_data_url) {
    shapes = shapesFromLegacyImage(drawing_data_url);
  }
  return {
    drawing_data_url,
    brush_size: Number.isFinite(brush) && brush > 0 ? brush : 2,
    stroke_color: String(r.stroke_color ?? "#111827").trim() || "#111827",
    shapes,
  };
}

export const PLANT_LAYOUT_CANVAS_WIDTH = 1100;
export const PLANT_LAYOUT_CANVAS_HEIGHT = 780;

export const PLANT_LAYOUT_BOX_STROKE_WIDTH = 2;
export const PLANT_LAYOUT_BOX_STROKE_COLOR = "#111827";

export type { PlantLayoutShape } from "@/lib/plant-layout-canvas";
