"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  canvasToContentCroppedDataUrl,
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
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function isRectangle(
  shape: PlantLayoutShape | null | undefined,
): shape is Extract<PlantLayoutShape, { type: "rectangle" }> {
  return shape?.type === "rectangle";
}

export const PlantLayoutCanvasEditor = forwardRef<
  PlantLayoutCanvasEditorHandle,
  PlantLayoutCanvasEditorProps
>(function PlantLayoutCanvasEditor(
  { storeKey, initialShapes, onChange, variant = "plant-layout" },
  ref,
) {
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
  const onChangeRef = useRef(onChange);
  const initialShapesRef = useRef(initialShapes);
  const selectedIdRef = useRef<string | null>(null);
  const previewRef = useRef<PlantLayoutShape | null>(null);
  const readyRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const redrawGenRef = useRef(0);

  onChangeRef.current = onChange;
  initialShapesRef.current = initialShapes;

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<PlantLayoutTool>("draw");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boxText, setBoxText] = useState("");
  const [hierarchyType, setHierarchyType] = useState<string>(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
  /** Bumps when selection changes so label UI re-reads shapesRef without tracking every drag. */
  const [selectionTick, setSelectionTick] = useState(0);

  selectedIdRef.current = selectedId;

  const selectedShape =
    shapesRef.current.find((shape) => shape.id === selectedId) ?? null;
  const selectedRectangle = isRectangle(selectedShape) ? selectedShape : null;
  void selectionTick;

  const emitChange = useCallback((shapes: PlantLayoutShape[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChangeRef.current({
      // Crop to content so print/preview box fits the layout (no empty canvas padding).
      drawing_data_url: canvasToContentCroppedDataUrl(canvas, shapes, 28),
      shapes: cloneShapes(shapes),
    });
  }, []);

  const pushHistory = useCallback((shapes: PlantLayoutShape[]) => {
    historyRef.current = [...historyRef.current.slice(-19), cloneShapes(shapes)];
  }, []);

  const redraw = useCallback(
    async (
      shapes: PlantLayoutShape[],
      selection: string | null,
      preview: PlantLayoutShape | null,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const gen = ++redrawGenRef.current;
      const scene = preview ? [...shapes, preview] : shapes;
      await renderPlantLayoutScene(ctx, canvas.width, canvas.height, scene, selection);
      // Drop stale frames if a newer redraw started while we awaited image load.
      if (gen !== redrawGenRef.current) return;
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
      }
    },
    [],
  );

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      void redraw(shapesRef.current, selectedIdRef.current, previewRef.current);
    });
  }, [redraw]);

  const commitShapes = useCallback(
    async (shapes: PlantLayoutShape[], selection: string | null = selectedIdRef.current) => {
      shapesRef.current = shapes;
      previewRef.current = null;
      await redraw(shapes, selection, null);
      emitChange(shapes);
    },
    [emitChange, redraw],
  );

  const updateShapes = useCallback(
    async (
      updater: (shapes: PlantLayoutShape[]) => PlantLayoutShape[],
      recordHistory = true,
    ) => {
      const next = updater(shapesRef.current);
      shapesRef.current = next;
      previewRef.current = null;
      await redraw(next, selectedIdRef.current, null);
      if (recordHistory) pushHistory(next);
      emitChange(next);
      setSelectionTick((n) => n + 1);
    },
    [emitChange, pushHistory, redraw],
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

  // Reset canvas only when the application/document key changes — not on every parent re-render.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = PLANT_LAYOUT_CANVAS_WIDTH;
    canvas.height = PLANT_LAYOUT_CANVAS_HEIGHT;
    lastPointRef.current = null;
    shapeStartRef.current = null;
    dragRef.current = null;
    previewRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const shapes = cloneShapes(initialShapesRef.current);
    shapesRef.current = shapes;
    historyRef.current = [shapes];
    selectedIdRef.current = null;
    setSelectedId(null);
    setBoxText("");
    setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    setTool("draw");
    readyRef.current = false;
    setReady(false);
    setSelectionTick((n) => n + 1);

    void redraw(shapes, null, null).then(() => emitChange(shapes));

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [storeKey, redraw, emitChange]);

  const applyFieldsToSelected = useCallback(
    (label: string, nextHierarchyType?: string) => {
      if (!selectedIdRef.current) return;
      const id = selectedIdRef.current;
      void updateShapes((shapes) =>
        shapes.map((shape) => {
          if (shape.id !== id || shape.type !== "rectangle") return shape;
          return {
            ...shape,
            label,
            ...(isProcessFlow
              ? { hierarchyType: nextHierarchyType ?? shape.hierarchyType }
              : {}),
          };
        }),
      );
    },
    [isProcessFlow, updateShapes],
  );

  useEffect(() => {
    if (skipLabelApplyRef.current) {
      skipLabelApplyRef.current = false;
      return;
    }
    if (!selectedRectangle) return;
    const hierarchyChanged =
      isProcessFlow &&
      hierarchyType !== (selectedRectangle.hierarchyType ?? DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    if (boxText !== selectedRectangle.label || hierarchyChanged) {
      applyFieldsToSelected(boxText, hierarchyType);
    }
  }, [boxText, hierarchyType, isProcessFlow, selectedRectangle, applyFieldsToSelected]);

  function selectRectangle(
    shape: Extract<PlantLayoutShape, { type: "rectangle" }>,
    options?: { switchToEdit?: boolean },
  ) {
    skipLabelApplyRef.current = true;
    selectedIdRef.current = shape.id;
    setSelectedId(shape.id);
    setBoxText(shape.label);
    if (isProcessFlow) {
      setHierarchyType(shape.hierarchyType ?? DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    }
    if (options?.switchToEdit) setTool("select");
    setSelectionTick((n) => n + 1);
    scheduleRedraw();
  }

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !readyRef.current) return;
    const point = getCanvasPoint(canvas, clientX, clientY);
    lastPointRef.current = point;

    if (tool === "select") {
      const selected = shapesRef.current.find((s) => s.id === selectedIdRef.current);
      if (isRectangle(selected)) {
        const handle = hitTestRectHandle(selected, point);
        if (handle) {
          dragRef.current = { shapeId: selected.id, start: point, handle };
          return;
        }
      }

      const hit = hitTestShape(shapesRef.current, point);
      if (hit?.type === "rectangle") {
        selectRectangle(hit, { switchToEdit: true });
        dragRef.current = { shapeId: hit.id, start: point };
        return;
      }

      selectedIdRef.current = null;
      setSelectedId(null);
      skipLabelApplyRef.current = true;
      setBoxText("");
      setSelectionTick((n) => n + 1);
      scheduleRedraw();
      return;
    }

    if (tool === "draw") {
      selectedIdRef.current = null;
      setSelectedId(null);
      skipLabelApplyRef.current = true;
      setBoxText("");
      setSelectionTick((n) => n + 1);
      shapeStartRef.current = point;
    }
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !readyRef.current) return;

    // Idle hover — do not redraw / setState.
    if (!dragRef.current && !(shapeStartRef.current && tool === "draw")) {
      return;
    }

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
      scheduleRedraw();
      return;
    }

    if (shapeStartRef.current && tool === "draw") {
      const rect = normalizeRect(shapeStartRef.current, point);
      previewRef.current = {
        id: "__preview__",
        type: "rectangle",
        ...rect,
        strokeColor: PLANT_LAYOUT_BOX_STROKE_COLOR,
        strokeWidth: PLANT_LAYOUT_BOX_STROKE_WIDTH,
        label: "",
      };
      lastPointRef.current = point;
      scheduleRedraw();
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      pushHistory(shapesRef.current);
      emitChange(shapesRef.current);
      lastPointRef.current = null;
      setSelectionTick((n) => n + 1);
      return;
    }

    if (shapeStartRef.current && tool === "draw") {
      const start = shapeStartRef.current;
      const end = lastPointRef.current ?? start;
      const rect = normalizeRect(start, end);
      shapeStartRef.current = null;
      previewRef.current = null;

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
        selectedIdRef.current = shape.id;
        setSelectedId(shape.id);
        setBoxText("");
      } else {
        scheduleRedraw();
      }
      lastPointRef.current = null;
      return;
    }

    lastPointRef.current = null;
  };

  function deleteSelected() {
    if (!selectedIdRef.current) return;
    const id = selectedIdRef.current;
    void updateShapes((shapes) => shapes.filter((shape) => shape.id !== id));
    selectedIdRef.current = null;
    setSelectedId(null);
    skipLabelApplyRef.current = true;
    setBoxText("");
    if (isProcessFlow) setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
  }

  function clearCanvas() {
    shapesRef.current = [];
    historyRef.current = [[]];
    selectedIdRef.current = null;
    setSelectedId(null);
    previewRef.current = null;
    setBoxText("");
    setHierarchyType(DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE);
    void commitShapes([]);
  }

  function undo() {
    if (historyRef.current.length <= 1) {
      clearCanvas();
      onChangeRef.current({ drawing_data_url: "", shapes: [] });
      return;
    }
    historyRef.current = historyRef.current.slice(0, -1);
    const previous = historyRef.current[historyRef.current.length - 1] ?? [];
    shapesRef.current = cloneShapes(previous);
    selectedIdRef.current = null;
    setSelectedId(null);
    previewRef.current = null;
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
                setHierarchyType(
                  selectedRectangle.hierarchyType ?? DEFAULT_PROCESS_FLOW_HIERARCHY_TYPE,
                );
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
        {!isProcessFlow ? (
          <label className="flex min-w-[16rem] max-w-xl flex-1 items-center gap-2">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
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
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        ) : null}
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
      ) : null}

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
