"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type KeyboardEvent,
} from "react";
import { renderPlantLayoutScene, replaceBackgroundImage, type PlantLayoutShape } from "@/lib/plant-layout-canvas";
import {
  PROCESS_FLOW_CHART_CANVAS_WIDTH,
} from "@/lib/process-flow-chart";
import {
  buildShapesFromOutline,
  canvasHeightForOutline,
  clampLevel,
  createEmptyOutlineItem,
  hierarchyLabelForLevel,
  insertOutlineRowAfter,
  removeOutlineRow,
  updateOutlineRowLevel,
  type ProcessFlowOutlineItem,
} from "@/lib/process-flow-outline";
import type { ProcessFlowChartSettings } from "@/lib/process-flow-chart-settings";

export type ProcessFlowChartEditorHandle = {
  setBackgroundImage: (dataUrl: string) => void;
  captureSnapshot: () => Promise<{
    drawing_data_url: string;
    shapes: PlantLayoutShape[];
    outline_items: ProcessFlowOutlineItem[];
  } | null>;
};

type ProcessFlowChartEditorProps = {
  storeKey: string;
  initialOutlineItems: ProcessFlowOutlineItem[];
  initialShapes: PlantLayoutShape[];
  chartSettings: ProcessFlowChartSettings;
  onChange: (payload: {
    drawing_data_url: string;
    shapes: PlantLayoutShape[];
    outline_items: ProcessFlowOutlineItem[];
  }) => void;
};

export const ProcessFlowChartEditor = forwardRef<
  ProcessFlowChartEditorHandle,
  ProcessFlowChartEditorProps
>(function ProcessFlowChartEditor(
  { storeKey, initialOutlineItems, initialShapes, chartSettings, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundShapesRef = useRef<PlantLayoutShape[]>(
    initialShapes.filter((shape) => shape.type === "legacy"),
  );
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const hydratedStoreKeyRef = useRef<string | null>(null);

  const [outlineItems, setOutlineItems] = useState<ProcessFlowOutlineItem[]>(initialOutlineItems);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOutlineItems[0]?.id ?? null,
  );

  const renderPreview = useCallback(
    async (
      items: ProcessFlowOutlineItem[],
      selection: string | null,
      settings: ProcessFlowChartSettings,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      canvas.height = canvasHeightForOutline(items, settings);

      const shapes = buildShapesFromOutline(items, backgroundShapesRef.current, settings);
      await renderPlantLayoutScene(ctx, canvas.width, canvas.height, shapes, selection);
      const payload = {
        drawing_data_url: canvas.toDataURL("image/png"),
        shapes,
        outline_items: items,
      };
      onChangeRef.current(payload);
      return payload;
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      setBackgroundImage(dataUrl: string) {
        backgroundShapesRef.current = replaceBackgroundImage(
          backgroundShapesRef.current,
          dataUrl,
        ).filter((shape) => shape.type === "legacy");
        void renderPreview(outlineItems, selectedId, chartSettings);
      },
      captureSnapshot() {
        return renderPreview(outlineItems, selectedId, chartSettings);
      },
    }),
    [outlineItems, renderPreview, selectedId, chartSettings],
  );

  useEffect(() => {
    if (hydratedStoreKeyRef.current === storeKey) return;
    hydratedStoreKeyRef.current = storeKey;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = PROCESS_FLOW_CHART_CANVAS_WIDTH;
      canvas.height = canvasHeightForOutline(initialOutlineItems, chartSettings);
    }
    backgroundShapesRef.current = initialShapes.filter((shape) => shape.type === "legacy");
    setOutlineItems(initialOutlineItems);
    setSelectedId(initialOutlineItems[0]?.id ?? null);
  }, [storeKey, initialOutlineItems, initialShapes, chartSettings]);

  useEffect(() => {
    if (hydratedStoreKeyRef.current !== storeKey) return;
    void renderPreview(outlineItems, selectedId, chartSettings);
  }, [outlineItems, selectedId, chartSettings, renderPreview, storeKey]);

  function focusRow(id: string) {
    window.requestAnimationFrame(() => {
      inputRefs.current.get(id)?.focus();
    });
  }

  function patchItems(next: ProcessFlowOutlineItem[], focusId?: string) {
    setOutlineItems(next);
    if (focusId) {
      setSelectedId(focusId);
      focusRow(focusId);
    }
  }

  function handleTextChange(index: number, text: string) {
    patchItems(
      outlineItems.map((item, i) => (i === index ? { ...item, text } : item)),
    );
  }

  function handleEnter(index: number) {
    const nextItems = insertOutlineRowAfter(outlineItems, index);
    const newRow = nextItems[index + 1];
    patchItems(nextItems, newRow.id);
  }

  function handleTab(index: number, outdent: boolean) {
    const delta = outdent ? -1 : 1;
    const item = outlineItems[index];
    if (!item) return;
    const nextLevel = clampLevel(item.level + delta);
    if (nextLevel === item.level) return;
    patchItems(updateOutlineRowLevel(outlineItems, index, delta));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number, item: ProcessFlowOutlineItem) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleEnter(index);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      handleTab(index, event.shiftKey);
      return;
    }
    if (event.key === "Backspace" && item.text === "" && outlineItems.length > 1) {
      event.preventDefault();
      const nextItems = removeOutlineRow(outlineItems, index);
      const focusIndex = Math.max(0, index - 1);
      patchItems(nextItems, nextItems[focusIndex]?.id);
    }
  }

  function deleteRow(index: number) {
    const nextItems = removeOutlineRow(outlineItems, index);
    const focusIndex = Math.min(index, nextItems.length - 1);
    patchItems(nextItems, nextItems[focusIndex]?.id);
  }

  function deleteSelectedRow() {
    const index = outlineItems.findIndex((item) => item.id === selectedId);
    if (index < 0) return;
    deleteRow(index);
  }

  function addRowAtEnd() {
    const last = outlineItems[outlineItems.length - 1] ?? createEmptyOutlineItem(0);
    const newRow = createEmptyOutlineItem(last.level);
    patchItems([...outlineItems, newRow], newRow.id);
  }

  const selectedIndex = outlineItems.findIndex((item) => item.id === selectedId);
  const canDelete = outlineItems.length > 1;

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <aside className="flex w-full min-h-0 max-w-sm shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Process Hierarchy</h3>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <ol className="space-y-1">
            {outlineItems.map((item, index) => {
              const isSelected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <div
                    className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 transition ${
                      isSelected
                        ? "border-sky-500/60 bg-sky-950/30"
                        : "border-transparent hover:border-zinc-800 hover:bg-zinc-900/80"
                    }`}
                    style={{ paddingLeft: `${8 + Math.min(item.level * 12, 180)}px` }}
                    onMouseDown={() => setSelectedId(item.id)}
                  >
                    <span
                      className="mt-2 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
                      title={hierarchyLabelForLevel(item.level)}
                    >
                      L{item.level + 1}
                    </span>
                    <input
                      ref={(node) => {
                        if (node) inputRefs.current.set(item.id, node);
                        else inputRefs.current.delete(item.id);
                      }}
                      type="text"
                      value={item.text}
                      onChange={(e) => handleTextChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, item)}
                      onFocus={() => setSelectedId(item.id)}
                      placeholder={`${hierarchyLabelForLevel(item.level)}…`}
                      className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRow(index);
                      }}
                      disabled={!canDelete}
                      className="mt-1 shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Delete step"
                      title="Delete step"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-800 p-3">
          <button
            type="button"
            onClick={addRowAtEnd}
            className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            + Add step
          </button>
          <button
            type="button"
            onClick={deleteSelectedRow}
            disabled={!canDelete || selectedIndex < 0}
            className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete step
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2">
          <canvas
            ref={canvasRef}
            className="mx-auto block max-w-full rounded-lg border border-zinc-700 bg-white shadow-sm"
          />
        </div>
      </div>
    </div>
  );
});
