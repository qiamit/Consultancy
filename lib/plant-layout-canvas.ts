export type PlantLayoutPoint = { x: number; y: number };

export type PlantLayoutShape =
  | {
      id: string;
      type: "pen";
      points: PlantLayoutPoint[];
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "arrow";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      strokeColor: string;
      strokeWidth: number;
      dashed?: boolean;
      headStyle?: "filled" | "open" | "none";
      routing?: "straight" | "elbow";
    }
  | {
      id: string;
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      strokeColor: string;
      strokeWidth: number;
      label: string;
      hierarchyType?: string;
    }
  | {
      id: string;
      type: "circle";
      cx: number;
      cy: number;
      radius: number;
      strokeColor: string;
      strokeWidth: number;
      label: string;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      strokeColor: string;
      fontSize: number;
    }
  | {
      id: string;
      type: "legacy";
      dataUrl: string;
    };

export type RectHandle = "nw" | "ne" | "sw" | "se";

export function createShapeId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeRect(start: PlantLayoutPoint, end: PlantLayoutPoint) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
}

export function cloneShapes(shapes: PlantLayoutShape[]): PlantLayoutShape[] {
  return JSON.parse(JSON.stringify(shapes)) as PlantLayoutShape[];
}

export function parsePlantLayoutShapes(raw: unknown): PlantLayoutShape[] {
  if (!Array.isArray(raw)) return [];
  const shapes: PlantLayoutShape[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = String(r.id ?? createShapeId());
    const type = String(r.type ?? "");
    if (type === "pen" && Array.isArray(r.points)) {
      shapes.push({
        id,
        type: "pen",
        points: r.points
          .map((p) => {
            if (!p || typeof p !== "object") return null;
            const pt = p as Record<string, unknown>;
            const x = Number(pt.x);
            const y = Number(pt.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x, y };
          })
          .filter((p): p is PlantLayoutPoint => p !== null),
        strokeColor: String(r.strokeColor ?? "#111827"),
        strokeWidth: Number(r.strokeWidth) > 0 ? Number(r.strokeWidth) : 3,
      });
      continue;
    }
    if (type === "line") {
      shapes.push({
        id,
        type: "line",
        x1: Number(r.x1) || 0,
        y1: Number(r.y1) || 0,
        x2: Number(r.x2) || 0,
        y2: Number(r.y2) || 0,
        strokeColor: String(r.strokeColor ?? "#111827"),
        strokeWidth: Number(r.strokeWidth) > 0 ? Number(r.strokeWidth) : 3,
      });
      continue;
    }
    if (type === "arrow") {
      const headStyle = String(r.headStyle ?? "");
      const routing = String(r.routing ?? "");
      shapes.push({
        id,
        type: "arrow",
        x1: Number(r.x1) || 0,
        y1: Number(r.y1) || 0,
        x2: Number(r.x2) || 0,
        y2: Number(r.y2) || 0,
        strokeColor: String(r.strokeColor ?? "#374151"),
        strokeWidth: Number(r.strokeWidth) > 0 ? Number(r.strokeWidth) : 2,
        dashed: Boolean(r.dashed),
        headStyle:
          headStyle === "open" || headStyle === "none" || headStyle === "filled"
            ? headStyle
            : undefined,
        routing: routing === "elbow" || routing === "straight" ? routing : undefined,
      });
      continue;
    }
    if (type === "rectangle") {
      shapes.push({
        id,
        type: "rectangle",
        x: Number(r.x) || 0,
        y: Number(r.y) || 0,
        width: Number(r.width) || 0,
        height: Number(r.height) || 0,
        strokeColor: String(r.strokeColor ?? "#111827"),
        strokeWidth: Number(r.strokeWidth) > 0 ? Number(r.strokeWidth) : 3,
        label: String(r.label ?? ""),
        hierarchyType: String(r.hierarchyType ?? "").trim() || undefined,
      });
      continue;
    }
    if (type === "circle") {
      shapes.push({
        id,
        type: "circle",
        cx: Number(r.cx) || 0,
        cy: Number(r.cy) || 0,
        radius: Number(r.radius) || 0,
        strokeColor: String(r.strokeColor ?? "#111827"),
        strokeWidth: Number(r.strokeWidth) > 0 ? Number(r.strokeWidth) : 3,
        label: String(r.label ?? ""),
      });
      continue;
    }
    if (type === "text") {
      shapes.push({
        id,
        type: "text",
        x: Number(r.x) || 0,
        y: Number(r.y) || 0,
        text: String(r.text ?? ""),
        strokeColor: String(r.strokeColor ?? "#111827"),
        fontSize: Number(r.fontSize) > 0 ? Number(r.fontSize) : 16,
      });
      continue;
    }
    if (type === "legacy") {
      const dataUrl = String(r.dataUrl ?? "").trim();
      if (dataUrl) shapes.push({ id, type: "legacy", dataUrl });
    }
  }
  return shapes;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function rectangleDisplayText(shape: Extract<PlantLayoutShape, { type: "rectangle" }>): string {
  return shape.label.trim();
}

function wrapTextInRect(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const padding = 8;
  const maxWidth = Math.max(20, width - padding * 2);
  const lineHeight = fontSize * 1.2;
  const lines: string[] = [];
  const paragraphs = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);

  for (const paragraph of paragraphs) {
    let current = "";
    const wordsInParagraph = paragraph.split(/\s+/).filter(Boolean);
    for (const word of wordsInParagraph) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  if (lines.length === 0) return;

  const totalHeight = lines.length * lineHeight;
  let drawY = y + Math.max(padding, (height - totalHeight) / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const line of lines) {
    if (drawY + lineHeight > y + height - padding) break;
    ctx.fillText(line, x + width / 2, drawY, maxWidth);
    drawY += lineHeight;
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeColor: string,
  strokeWidth: number,
  options?: {
    dashed?: boolean;
    headStyle?: "filled" | "open" | "none";
    routing?: "straight" | "elbow";
  },
) {
  const headLength = Math.max(8, strokeWidth * 4);
  const headStyle = options?.headStyle ?? "filled";
  const routing = options?.routing ?? "straight";

  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(options?.dashed ? [6, 4] : []);

  const drawSegment = (sx: number, sy: number, ex: number, ey: number) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  };

  let tipX = x2;
  let tipY = y2;
  let lineEndX = x2;
  let lineEndY = y2;

  if (routing === "elbow" && Math.abs(x2 - x1) > 1) {
    const midY = y1 + (y2 - y1) / 2;
    drawSegment(x1, y1, x1, midY);
    drawSegment(x1, midY, x2, midY);
    const tipInset = headLength * 0.85;
    lineEndX = x2;
    lineEndY = y2 - tipInset;
    drawSegment(x2, midY, lineEndX, lineEndY);
    tipX = x2;
    tipY = y2;
  } else {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const tipInset = headLength * 0.85;
    lineEndX = x2 - tipInset * Math.cos(angle);
    lineEndY = y2 - tipInset * Math.sin(angle);
    drawSegment(x1, y1, lineEndX, lineEndY);
  }

  ctx.setLineDash([]);

  if (headStyle === "none") return;

  const angle = Math.atan2(tipY - lineEndY, tipX - lineEndX);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - headLength * Math.cos(angle - Math.PI / 6),
    tipY - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    tipX - headLength * Math.cos(angle + Math.PI / 6),
    tipY - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  if (headStyle === "open") {
    ctx.stroke();
  } else {
    ctx.fill();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, shape: PlantLayoutShape) {
  if (shape.type === "legacy") return;

  if (shape.type === "pen") {
    if (shape.points.length < 2) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (let i = 1; i < shape.points.length; i += 1) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.stroke();
    return;
  }

  if (shape.type === "line") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.stroke();
    return;
  }

  if (shape.type === "arrow") {
    drawArrow(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.strokeColor, shape.strokeWidth, {
      dashed: shape.dashed,
      headStyle: shape.headStyle,
      routing: shape.routing,
    });
    return;
  }

  if (shape.type === "rectangle") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    const displayText = rectangleDisplayText(shape);
    if (displayText.trim()) {
      ctx.fillStyle = shape.strokeColor;
      const fontSize = Math.max(12, Math.min(18, Math.floor(Math.min(shape.width, shape.height) / 6)));
      ctx.font = `${fontSize}px Arial`;
      wrapTextInRect(
        ctx,
        displayText,
        shape.x,
        shape.y,
        shape.width,
        shape.height,
        fontSize,
      );
    }
    return;
  }

  if (shape.type === "circle") {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = shape.strokeColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.beginPath();
    ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
    ctx.stroke();
    if (shape.label.trim()) {
      ctx.fillStyle = shape.strokeColor;
      const fontSize = Math.max(12, Math.min(18, Math.floor(shape.radius / 3)));
      ctx.font = `${fontSize}px Arial`;
      wrapTextInRect(
        ctx,
        shape.label,
        shape.cx - shape.radius,
        shape.cy - shape.radius,
        shape.radius * 2,
        shape.radius * 2,
        fontSize,
      );
    }
    return;
  }

  if (shape.type === "text") {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = shape.strokeColor;
    ctx.font = `${shape.fontSize}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(shape.text, shape.x, shape.y);
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, shape: PlantLayoutShape) {
  if (shape.type === "rectangle") {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1;
    ctx.strokeRect(shape.x - 2, shape.y - 2, shape.width + 4, shape.height + 4);
    ctx.setLineDash([]);
    const handles = getRectHandles(shape);
    ctx.fillStyle = "#0ea5e9";
    for (const handle of Object.values(handles)) {
      ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
    }
    return;
  }

  if (shape.type === "circle") {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(shape.cx, shape.cy, shape.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (shape.type === "line") {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (shape.type === "text") {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1;
    const width = Math.max(40, shape.text.length * shape.fontSize * 0.55);
    ctx.strokeRect(shape.x - 2, shape.y - 2, width + 4, shape.fontSize + 4);
    ctx.setLineDash([]);
  }
}

export function getRectHandles(shape: Extract<PlantLayoutShape, { type: "rectangle" }>) {
  const { x, y, width, height } = shape;
  return {
    nw: { x, y },
    ne: { x: x + width, y },
    sw: { x, y: y + height },
    se: { x: x + width, y: y + height },
  } as Record<RectHandle, PlantLayoutPoint>;
}

export function hitTestRectHandle(
  shape: Extract<PlantLayoutShape, { type: "rectangle" }>,
  point: PlantLayoutPoint,
  tolerance = 10,
): RectHandle | null {
  const handles = getRectHandles(shape);
  for (const [key, handle] of Object.entries(handles) as [RectHandle, PlantLayoutPoint][]) {
    if (Math.hypot(point.x - handle.x, point.y - handle.y) <= tolerance) return key;
  }
  return null;
}

function pointInRect(point: PlantLayoutPoint, x: number, y: number, width: number, height: number) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

function distancePointToSegment(
  point: PlantLayoutPoint,
  a: PlantLayoutPoint,
  b: PlantLayoutPoint,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(point.x - px, point.y - py);
}

export function hitTestShape(
  shapes: PlantLayoutShape[],
  point: PlantLayoutPoint,
): PlantLayoutShape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const shape = shapes[i];
    if (shape.type === "legacy") continue;

    if (shape.type === "rectangle" && pointInRect(point, shape.x, shape.y, shape.width, shape.height)) {
      return shape;
    }
    if (shape.type === "circle") {
      const dist = Math.hypot(point.x - shape.cx, point.y - shape.cy);
      if (dist <= shape.radius) return shape;
    }
    if (shape.type === "line") {
      if (distancePointToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) <= 8) {
        return shape;
      }
    }
    if (shape.type === "text") {
      const width = Math.max(40, shape.text.length * shape.fontSize * 0.55);
      if (pointInRect(point, shape.x, shape.y, width, shape.fontSize + 4)) return shape;
    }
    if (shape.type === "pen") {
      for (let j = 1; j < shape.points.length; j += 1) {
        if (distancePointToSegment(point, shape.points[j - 1], shape.points[j]) <= shape.strokeWidth + 4) {
          return shape;
        }
      }
    }
  }
  return null;
}

export function findRectangleAtPoint(
  shapes: PlantLayoutShape[],
  point: PlantLayoutPoint,
): Extract<PlantLayoutShape, { type: "rectangle" }> | null {
  const hit = hitTestShape(shapes, point);
  return hit?.type === "rectangle" ? hit : null;
}

export function moveShape(shape: PlantLayoutShape, dx: number, dy: number): PlantLayoutShape {
  if (shape.type === "pen") {
    return {
      ...shape,
      points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    };
  }
  if (shape.type === "line") {
    return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy };
  }
  if (shape.type === "rectangle") {
    return { ...shape, x: shape.x + dx, y: shape.y + dy };
  }
  if (shape.type === "circle") {
    return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
  }
  if (shape.type === "text") {
    return { ...shape, x: shape.x + dx, y: shape.y + dy };
  }
  return shape;
}

export function resizeRectangle(
  shape: Extract<PlantLayoutShape, { type: "rectangle" }>,
  handle: RectHandle,
  point: PlantLayoutPoint,
): Extract<PlantLayoutShape, { type: "rectangle" }> {
  const right = shape.x + shape.width;
  const bottom = shape.y + shape.height;
  let x = shape.x;
  let y = shape.y;
  let width = shape.width;
  let height = shape.height;

  if (handle === "nw") {
    width = right - point.x;
    height = bottom - point.y;
    x = point.x;
    y = point.y;
  } else if (handle === "ne") {
    width = point.x - shape.x;
    height = bottom - point.y;
    y = point.y;
  } else if (handle === "sw") {
    width = right - point.x;
    height = point.y - shape.y;
    x = point.x;
  } else {
    width = point.x - shape.x;
    height = point.y - shape.y;
  }

  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }

  return { ...shape, x, y, width, height };
}

export async function renderPlantLayoutScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shapes: PlantLayoutShape[],
  selectedId: string | null,
): Promise<void> {
  drawGrid(ctx, width, height);

  for (const shape of shapes) {
    if (shape.type === "legacy") {
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, width, height);
          resolve();
        };
        image.onerror = () => resolve();
        image.src = shape.dataUrl;
      });
      continue;
    }
    drawShape(ctx, shape);
  }

  if (selectedId) {
    const selected = shapes.find((shape) => shape.id === selectedId);
    if (selected && selected.type !== "legacy") drawSelection(ctx, selected);
  }
}

export function shapesFromLegacyImage(dataUrl: string): PlantLayoutShape[] {
  if (!dataUrl.trim()) return [];
  return [{ id: createShapeId(), type: "legacy", dataUrl }];
}

export function replaceBackgroundImage(
  shapes: PlantLayoutShape[],
  dataUrl: string,
): PlantLayoutShape[] {
  const withoutLegacy = shapes.filter((shape) => shape.type !== "legacy");
  return [{ id: createShapeId(), type: "legacy", dataUrl }, ...withoutLegacy];
}
