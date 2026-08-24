"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  cloneShapes,
  createShapeId,
  hitTestRectHandle,
  hitTestShape,
  moveShape,
  normalizeRect,
  renderPlantLayoutScene,
  replaceBackgroundImage,
  resizeRectangle,
  type PlantLayoutPoint,
  type PlantLayoutShape,
  type RectHandle,
} from "@backend/modules/bis/plant-layout-canvas";
import {
  PLANT_LAYOUT_BOX_STROKE_COLOR,
  PLANT_LAYOUT_BOX_STROKE_WIDTH,
  PLANT_LAYOUT_CANVAS_HEIGHT,
  PLANT_LAYOUT_CANVAS_WIDTH,
  type PlantLayoutTool,
} from "@backend/modules/bis/plant-layout";

import {
  DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE,
  PROCESS_FLOW_HIERARCHY_TYPES,
} from "@backend/modules/bis/process-flow-chart";

export type LayoutCanvasEditorVariant = "plant-layout" | "process-flow";

type PlantLayoutCanvasEditorProps = {
  storeKey: string;
  initialShapes: PlantLayoutShape[];
  onChange: (payload: { drawing_data_url: string; shapes: PlantLayoutShape[] }) => void;
  variant?: LayoutCanvasEditorVariant;
};

export type PlantLayoutCanvasEditorHandle = {
  setBackgroundImage: (dataUrl: string) => void;
};

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): PlantLayoutPoint {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function isRectangle(shape: PlantLayoutShape | null | undefined): shape is Extract<PlantLayoutShape, { type: "rectangle" }> {
  return shape?.type === "rectangle";
}

export const PlantLayoutCanvasEditor = forwardRef<
  PlantLayoutCanvasEditorHandle,
  PlantLayoutCanvasEditorProps
>(function PlantLayoutCanvasEditor({ storeKey, initialShapes, onChange, variant = "plant-layout" }, ref) {
  const isProcessFlow = variant === "process-flow";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<PlantLayoutShape[]>(cloneShapes(initialShapes));
  const historyRef = useRef<PlantLayoutShape[][]>([cloneShapes(initialShapes)]);
  const lastPointRef = useRef<PlantLayoutPoint | null>(null);
  const shapeStartRef = useRef<PlantLayoutPoint | null>(null);
  const dragRef = useRef<{
    shapeId: string;
    start: PlantLayoutPoint;
    handle?: RectHandle;
  } | null>(null);
  const skipLabelApplyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<PlantLayoutTool>("draw");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewShape, setPreviewShape] = useState<PlantLayoutShape | null>(null);
  const [boxText, setBoxText] = useState("");
  const [hierarchyType, setHierarchyType] = useState<string>(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);

  const selectedShape = shapesRef.current.find((shape) => shape.id === selectedId) ?? null;
  const selectedRectangle = isRectangle(selectedShape) ? selectedShape : null;

  const emitChange = useCallback(
    (shapes: PlantLayoutShape[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      onChange({ drawing_data_url: canvas.toDataURL("image/png"), shapes: cloneShapes(shapes) });
    },
    [onChange],
  );

  const pushHistory = useCallback((shapes: PlantLayoutShape[]) => {
    historyRef.current = [...historyRef.current.slice(-19), cloneShapes(shapes)];
  }, []);

  const redraw = useCallback(
    async (shapes: PlantLayoutShape[], selection: string | null, preview: PlantLayoutShape | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scene = preview ? [...shapes, preview] : shapes;
      await renderPlantLayoutScene(ctx, canvas.width, canvas.height, scene, selection);
      setReady(true);
    },
    [],
  );

  const commitShapes = useCallback(
    async (shapes: PlantLayoutShape[], selection: string | null = selectedId) => {
      shapesRef.current = shapes;
      await redraw(shapes, selection, null);
      setPreviewShape(null);
      emitChange(shapes);
    },
    [emitChange, redraw, selectedId],
  );

  const updateShapes = useCallback(
    async (updater: (shapes: PlantLayoutShape[]) => PlantLayoutShape[], recordHistory = true) => {
      const next = updater(shapesRef.current);
      shapesRef.current = next;
      await redraw(next, selectedId, previewShape);
      if (recordHistory) pushHistory(next);
      emitChange(next);
    },
    [emitChange, previewShape, pushHistory, redraw, selectedId],
  );

  useImperativeHandle(
    ref,
    () => ({
      setBackgroundImage(dataUrl: string) {
        void updateShapes((shapes) => replaceBackgroundImage(shapes, dataUrl));
      },
    }),
    [updateShapes],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PLANT_LAYOUT_CANVAS_WIDTH;
    canvas.height = PLANT_LAYOUT_CANVAS_HEIGHT;
    lastPointRef.current = null;
    shapeStartRef.current = null;
    dragRef.current = null;

    const shapes = cloneShapes(initialShapes);
    shapesRef.current = shapes;
    historyRef.current = [shapes];
    setSelectedId(null);
    setPreviewShape(null);
    setBoxText("");
    setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    setTool("draw");

    void redraw(shapes, null, null).then(() => emitChange(shapes));
  }, [storeKey, initialShapes, redraw, emitChange]);

  useEffect(() => {
    void redraw(shapesRef.current, selectedId, previewShape);
  }, [selectedId, previewShape, redraw]);

  const applyFieldsToSelected = useCallback(
    (label: string, nextHierarchyType?: string) => {
      if (!selectedId) return;
      void updateShapes((shapes) =>
        shapes.map((shape) => {
          if (shape.id !== selectedId || shape.type !== "rectangle") return shape;
          return {
            ...shape,
            label,
            ...(isProcessFlow ? { hierarchyType: nextHierarchyType ?? shape.hierarchyType } : {}),
          };
        }),
      );
    },
    [isProcessFlow, selectedId, updateShapes],
  );

  useEffect(() => {
    if (skipLabelApplyRef.current) {
      skipLabelApplyRef.current = false;
      return;
    }
    if (!selectedRectangle) return;
    const hierarchyChanged =
      isProcessFlow && hierarchyType !== (selectedRectangle.hierarchyType ?? DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    if (boxText !== selectedRectangle.label || hierarchyChanged) {
      applyFieldsToSelected(boxText, hierarchyType);
    }
  }, [boxText, hierarchyType, isProcessFlow, selectedRectangle, applyFieldsToSelected]);

  function selectRectangle(
    shape: Extract<PlantLayoutShape, { type: "rectangle" }>,
    options?: { switchToEdit?: boolean },
  ) {
    skipLabelApplyRef.current = true;
    setSelectedId(shape.id);
    setBoxText(shape.label);
    if (isProcessFlow) {
      setHierarchyType(shape.hierarchyType ?? DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    }
    if (options?.switchToEdit) setTool("select");
  }

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const point = getCanvasPoint(canvas, clientX, clientY);
    lastPointRef.current = point;

    if (tool === "select") {
      if (selectedRectangle) {
        const handle = hitTestRectHandle(selectedRectangle, point);
        if (handle) {
          dragRef.current = { shapeId: selectedRectangle.id, start: point, handle };
          return;
        }
      }

      const hit = hitTestShape(shapesRef.current, point);
      if (hit?.type === "rectangle") {
        selectRectangle(hit, { switchToEdit: true });
        dragRef.current = { shapeId: hit.id, start: point };
        return;
      }

      setSelectedId(null);
      skipLabelApplyRef.current = true;
      setBoxText("");
      return;
    }

    if (tool === "draw") {
      setSelectedId(null);
      skipLabelApplyRef.current = true;
      setBoxText("");
      shapeStartRef.current = point;
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(canvas, clientX, clientY);

    if (dragRef.current) {
      const { shapeId, start, handle } = dragRef.current;
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      const shapes = shapesRef.current.map((shape) => {
        if (shape.id !== shapeId) return shape;
        if (handle && shape.type === "rectangle") return resizeRectangle(shape, handle, point);
        return moveShape(shape, dx, dy);
      });
      shapesRef.current = shapes;
      dragRef.current = { shapeId, start: point, handle };
      void redraw(shapes, selectedId, null);
      return;
    }

    if (shapeStartRef.current && tool === "draw") {
      const rect = normalizeRect(shapeStartRef.current, point);
      setPreviewShape({
        id: "__preview__",
        type: "rectangle",
        ...rect,
        strokeColor: PLANT_LAYOUT_BOX_STROKE_COLOR,
        strokeWidth: PLANT_LAYOUT_BOX_STROKE_WIDTH,
        label: "",
      });
      lastPointRef.current = point;
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      pushHistory(shapesRef.current);
      emitChange(shapesRef.current);
      lastPointRef.current = null;
      return;
    }

    if (shapeStartRef.current && tool === "draw") {
      const start = shapeStartRef.current;
      const end = lastPointRef.current ?? start;
      const rect = normalizeRect(start, end);
      shapeStartRef.current = null;
      setPreviewShape(null);

      if (rect.width > 8 && rect.height > 8) {
        const shape: PlantLayoutShape = {
          id: createShapeId(),
          type: "rectangle",
          ...rect,
          strokeColor: PLANT_LAYOUT_BOX_STROKE_COLOR,
          strokeWidth: PLANT_LAYOUT_BOX_STROKE_WIDTH,
          label: "",
          ...(isProcessFlow ? { hierarchyType } : {}),
        };
        void updateShapes((shapes) => [...shapes, shape]);
        skipLabelApplyRef.current = true;
        setSelectedId(shape.id);
        setBoxText("");
      } else {
        void redraw(shapesRef.current, selectedId, null);
      }
      lastPointRef.current = null;
      return;
    }

    lastPointRef.current = null;
  };

  function deleteSelected() {
    if (!selectedId) return;
    void updateShapes((shapes) => shapes.filter((shape) => shape.id !== selectedId));
    setSelectedId(null);
    skipLabelApplyRef.current = true;
    setBoxText("");
    if (isProcessFlow) setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
  }

  function clearCanvas() {
    shapesRef.current = [];
    historyRef.current = [[]];
    setSelectedId(null);
    setPreviewShape(null);
    setBoxText("");
    setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    void commitShapes([]);
  }

  function undo() {
    if (historyRef.current.length <= 1) {
      clearCanvas();
      onChange({ drawing_data_url: "", shapes: [] });
      return;
    }
    historyRef.current = historyRef.current.slice(0, -1);
    const previous = historyRef.current[historyRef.current.length - 1] ?? [];
    shapesRef.current = cloneShapes(previous);
    setSelectedId(null);
    setPreviewShape(null);
    setBoxText("");
    setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    void commitShapes(shapesRef.current, null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTool("draw")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            tool === "draw"
              ? "border-violet-500 bg-violet-600 text-white"
              : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          Draw Box
        </button>
        <button
          type="button"
          onClick={() => {
            setTool("select");
            if (selectedRectangle) {
              skipLabelApplyRef.current = true;
              setBoxText(selectedRectangle.label);
              if (isProcessFlow) {
                setHierarchyType(selectedRectangle.hierarchyType ?? DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
              }
            }
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            tool === "select"
              ? "border-violet-500 bg-violet-600 text-white"
              : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          }`}
        >
          Edit Box
        </button>
        <button
          type="button"
          onClick={undo}
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!selectedId}
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Delete Box
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
        >
          Clear All
        </button>
      </div>

      {isProcessFlow ? (
        <div className="grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Hierarchy Type
            </span>
            <select
              value={hierarchyType}
              onChange={(e) => setHierarchyType(e.target.value)}
              disabled={!selectedRectangle}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {PROCESS_FLOW_HIERARCHY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Process Description
            </span>
            <input
              type="text"
              value={boxText}
              onChange={(e) => setBoxText(e.target.value)}
              disabled={!selectedRectangle}
              placeholder={
                selectedRectangle
                  ? "e.g. Mixing, Curing, Final Inspection"
                  : "Draw or select a box first"
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>
      ) : (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Text inside box
          </span>
          <input
            type="text"
            value={boxText}
            onChange={(e) => setBoxText(e.target.value)}
            disabled={!selectedRectangle}
            placeholder={
              selectedRectangle
                ? "e.g. Raw Material Store, Moulding Section"
                : "Draw or select a box first, then type text here"
            }
            className="mt-1 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
      )}

      {tool === "select" && selectedRectangle && (
        <p className="text-xs text-zinc-400">
          Drag the box to move · drag corner handles to resize ·
          {isProcessFlow
            ? " edit hierarchy type and description above."
            : " edit text in the field above."}
        </p>
      )}
      {tool === "draw" && (
        <p className="text-xs text-zinc-400">
          {isProcessFlow
            ? "Draw process boxes — including nested boxes. Set hierarchy type, then use Edit Box to adjust."
            : "Draw multiple boxes — including inside other boxes. Use Edit Box to select, move, or resize a box and add text."}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2">
        <canvas
          ref={canvasRef}
          className={`mx-auto block max-w-full touch-none rounded-lg border border-zinc-700 bg-white shadow-sm ${
            tool === "draw" ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ aspectRatio: `${PLANT_LAYOUT_CANVAS_WIDTH} / ${PLANT_LAYOUT_CANVAS_HEIGHT}` }}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handlePointerUp();
          }}
        />
      </div>
    </div>
  );
});
