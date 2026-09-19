"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  findRectangleAtPoint,
  renderPlantLayoutScene,
  canvasToContentCroppedDataUrl,
  replaceBackgroundImage,
  type PlantLayoutShape,
} from "@backend/modules/bis/plant-layout-canvas";
import {
  PROCESS_FLOW_CHART_CANVAS_WIDTH,
} from "@backend/modules/bis/process-flow-chart";
import {
  buildShapesFromOutline,
  canvasHeightForOutline,
  clampBoxHeight,
  clampBoxOffset,
  clampBoxWidth,
  clampLevel,
  createEmptyOutlineItem,
  hierarchyLabelForLevel,
  insertOutlineRowAfter,
  removeOutlineRow,
  updateOutlineRowLevel,
  type ProcessFlowOutlineItem,
} from "@backend/modules/bis/process-flow-outline";
import type { ProcessFlowChartSettings } from "@backend/modules/bis/process-flow-chart-settings";

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

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

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
  const shapesRef = useRef<PlantLayoutShape[]>([]);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const hydratedStoreKeyRef = useRef<string | null>(null);
  const outlineItemsRef = useRef<ProcessFlowOutlineItem[]>(initialOutlineItems);
  const selectedIdsRef = useRef<string[]>([]);
  const chartSettingsRef = useRef(chartSettings);
  const dragRef = useRef<{
    ids: string[];
    start: { x: number; y: number };
    originOffsets: Map<string, { x: number; y: number }>;
    current: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const [outlineItems, setOutlineItems] = useState<ProcessFlowOutlineItem[]>(initialOutlineItems);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialOutlineItems[0]?.id ? [initialOutlineItems[0].id] : [],
  );
  /** Local drafts so typing "200" is not clamped mid-keystroke (2→60, 60+0→600→400). */
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  outlineItemsRef.current = outlineItems;
  selectedIdsRef.current = selectedIds;
  chartSettingsRef.current = chartSettings;

  function applyDragOffsets(
    items: ProcessFlowOutlineItem[],
    drag: NonNullable<typeof dragRef.current>,
  ): ProcessFlowOutlineItem[] {
    const dx = drag.current.x - drag.start.x;
    const dy = drag.current.y - drag.start.y;
    if (dx === 0 && dy === 0) return items;
    const idSet = new Set(drag.ids);
    return items.map((item) => {
      if (!idSet.has(item.id)) return item;
      const origin = drag.originOffsets.get(item.id) ?? { x: 0, y: 0 };
      const offset_x = clampBoxOffset(origin.x + dx);
      const offset_y = clampBoxOffset(origin.y + dy);
      const next: ProcessFlowOutlineItem = { ...item };
      if (offset_x !== 0) next.offset_x = offset_x;
      else delete (next as { offset_x?: number }).offset_x;
      if (offset_y !== 0) next.offset_y = offset_y;
      else delete (next as { offset_y?: number }).offset_y;
      return next;
    });
  }

  const renderPreview = useCallback(
    async (
      items: ProcessFlowOutlineItem[],
      selection: string[] | null,
      settings: ProcessFlowChartSettings,
      options?: { emitChange?: boolean },
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      canvas.height = canvasHeightForOutline(items, settings);

      const shapes = buildShapesFromOutline(items, backgroundShapesRef.current, settings);
      shapesRef.current = shapes;
      await renderPlantLayoutScene(ctx, canvas.width, canvas.height, shapes, selection);
      const payload = {
        drawing_data_url: canvasToContentCroppedDataUrl(canvas, shapes, 16),
        shapes,
        outline_items: items,
      };
      if (options?.emitChange !== false) {
        onChangeRef.current(payload);
      }
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
        void renderPreview(outlineItems, selectedIds, chartSettings);
      },
      captureSnapshot() {
        // Print / save snapshot without editor selection chrome.
        return renderPreview(outlineItems, null, chartSettings);
      },
    }),
    [outlineItems, renderPreview, selectedIds, chartSettings],
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
    setSelectedIds(initialOutlineItems[0]?.id ? [initialOutlineItems[0].id] : []);
  }, [storeKey, initialOutlineItems, initialShapes, chartSettings]);

  // If parent restores a filled outline after an empty hydrate, pick it up without remount.
  // Only when local is empty — never overwrite a deliberate delete (fewer filled rows).
  useEffect(() => {
    if (hydratedStoreKeyRef.current !== storeKey) return;
    const nextFilled = initialOutlineItems.filter((item) => item.text.trim()).length;
    const curFilled = outlineItems.filter((item) => item.text.trim()).length;
    if (curFilled === 0 && nextFilled > 0) {
      setOutlineItems(initialOutlineItems);
      setSelectedIds(initialOutlineItems[0]?.id ? [initialOutlineItems[0].id] : []);
    }
  }, [storeKey, initialOutlineItems, outlineItems]);

  useEffect(() => {
    if (hydratedStoreKeyRef.current !== storeKey) return;
    void renderPreview(outlineItems, selectedIds, chartSettings);
  }, [outlineItems, selectedIds, chartSettings, renderPreview, storeKey]);

  function focusRow(id: string) {
    window.requestAnimationFrame(() => {
      inputRefs.current.get(id)?.focus();
    });
  }

  function selectOnly(id: string) {
    setSelectedIds([id]);
    focusRow(id);
  }

  function selectToggle(id: string) {
    setSelectedIds((prev) => {
      const next = toggleId(prev, id);
      if (next.length === 0) return [id];
      return next;
    });
  }

  function patchItems(next: ProcessFlowOutlineItem[], focusId?: string) {
    setOutlineItems(next);
    if (focusId) {
      setSelectedIds([focusId]);
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
    const removedId = outlineItems[index]?.id;
    const nextItems = removeOutlineRow(outlineItems, index);
    const focusIndex = Math.min(index, nextItems.length - 1);
    setOutlineItems(nextItems);
    setSelectedIds((prev) => {
      const filtered = prev.filter((id) => id !== removedId && nextItems.some((item) => item.id === id));
      if (filtered.length > 0) return filtered;
      const focusId = nextItems[focusIndex]?.id;
      return focusId ? [focusId] : [];
    });
  }

  function deleteSelectedRows() {
    const ids = selectedIdsRef.current;
    if (ids.length === 0) return;
    const prev = outlineItemsRef.current;
    if (prev.length <= 1) return;
    const removeSet = new Set(ids);
    let nextItems = prev.filter((item) => !removeSet.has(item.id));
    if (nextItems.length === 0) {
      nextItems = [createEmptyOutlineItem(0)];
    }
    setOutlineItems(nextItems);
    setSelectedIds(nextItems[0]?.id ? [nextItems[0].id] : []);
  }

  function addRowAtEnd() {
    const last = outlineItems[outlineItems.length - 1] ?? createEmptyOutlineItem(0);
    const newRow = createEmptyOutlineItem(last.level);
    patchItems([...outlineItems, newRow], newRow.id);
  }

  function handleOutlineRowMouseDown(
    event: ReactMouseEvent,
    id: string,
  ) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      selectToggle(id);
      return;
    }
    selectOnly(id);
  }

  function handleCanvasPointerDown(event: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = getCanvasPoint(canvas, event.clientX, event.clientY);
    const hit = findRectangleAtPoint(shapesRef.current, point);

    if (event.ctrlKey || event.metaKey) {
      if (hit) selectToggle(hit.id);
      return;
    }

    if (!hit) {
      setSelectedIds([]);
      return;
    }

    const alreadySelected = selectedIdsRef.current.includes(hit.id);
    const dragIds = alreadySelected
      ? selectedIdsRef.current.length > 0
        ? [...selectedIdsRef.current]
        : [hit.id]
      : [hit.id];

    if (!alreadySelected) {
      setSelectedIds([hit.id]);
      focusRow(hit.id);
    }

    const originOffsets = new Map<string, { x: number; y: number }>();
    for (const item of outlineItemsRef.current) {
      if (!dragIds.includes(item.id)) continue;
      originOffsets.set(item.id, {
        x: item.offset_x ?? 0,
        y: item.offset_y ?? 0,
      });
    }

    dragRef.current = {
      ids: dragIds,
      start: point,
      current: point,
      originOffsets,
      moved: false,
    };
    event.preventDefault();
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const point = getCanvasPoint(canvas, event.clientX, event.clientY);
      const dx = point.x - drag.start.x;
      const dy = point.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      drag.current = point;
      const liveItems = applyDragOffsets(outlineItemsRef.current, drag);
      void renderPreview(liveItems, selectedIdsRef.current, chartSettingsRef.current, {
        emitChange: false,
      });
    }

    function onPointerUp() {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (!drag.moved) return;
      const nextItems = applyDragOffsets(outlineItemsRef.current, drag);
      setOutlineItems(nextItems);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (selectedIdsRef.current.length === 0) return;
      if (outlineItemsRef.current.length <= 1) return;
      event.preventDefault();
      deleteSelectedRows();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [renderPreview]);

  const selectedItems = outlineItems.filter((item) => selectedIds.includes(item.id));
  const primarySelected = selectedItems[selectedItems.length - 1] ?? null;
  const canDelete = outlineItems.length > 1 && selectedIds.length > 0;

  const selectedWidth =
    primarySelected?.box_width && primarySelected.box_width > 0
      ? primarySelected.box_width
      : chartSettings.min_box_width;
  const selectedHeight =
    primarySelected?.box_height && primarySelected.box_height > 0
      ? primarySelected.box_height
      : chartSettings.box_height;

  const selectedIdsKey = selectedIds.join(",");
  useEffect(() => {
    setWidthDraft(null);
    setHeightDraft(null);
  }, [selectedIdsKey]);

  function patchSelectedBoxSize(patch: { box_width?: number; box_height?: number }) {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setOutlineItems(
      outlineItems.map((item) => {
        if (!idSet.has(item.id)) return item;
        const next: ProcessFlowOutlineItem = { ...item };
        if (patch.box_width !== undefined) {
          next.box_width = clampBoxWidth(patch.box_width);
        }
        if (patch.box_height !== undefined) {
          next.box_height = clampBoxHeight(patch.box_height);
        }
        return next;
      }),
    );
  }

  function commitWidthDraft(raw: string | null) {
    if (raw == null) return;
    const trimmed = raw.trim();
    if (trimmed === "" || !Number.isFinite(Number(trimmed))) {
      setWidthDraft(null);
      return;
    }
    patchSelectedBoxSize({ box_width: Number(trimmed) });
    setWidthDraft(null);
  }

  function commitHeightDraft(raw: string | null) {
    if (raw == null) return;
    const trimmed = raw.trim();
    if (trimmed === "" || !Number.isFinite(Number(trimmed))) {
      setHeightDraft(null);
      return;
    }
    patchSelectedBoxSize({ box_height: Number(trimmed) });
    setHeightDraft(null);
  }

  function handleWidthInputChange(raw: string) {
    setWidthDraft(raw);
    const n = Number(raw);
    // Live-apply only complete in-range values so "2" / "20" stay as typed.
    if (raw.trim() !== "" && Number.isFinite(n) && n >= 60 && n <= 400) {
      patchSelectedBoxSize({ box_width: n });
    }
  }

  function handleHeightInputChange(raw: string) {
    setHeightDraft(raw);
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n >= 28 && n <= 200) {
      patchSelectedBoxSize({ box_height: n });
    }
  }

  function clearSelectedBoxSize() {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setWidthDraft(null);
    setHeightDraft(null);
    setOutlineItems(
      outlineItems.map((item) => {
        if (!idSet.has(item.id)) return item;
        const {
          box_width: _w,
          box_height: _h,
          offset_x: _ox,
          offset_y: _oy,
          ...rest
        } = item;
        return rest;
      }),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <aside className="flex w-full min-h-0 max-w-sm shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Process Hierarchy</h3>
          <p className="mt-1 text-[10px] text-zinc-500">
            Ctrl/Cmd + click multi-select. Drag selected boxes on canvas.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <ol className="space-y-1">
            {outlineItems.map((item, index) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <li key={item.id}>
                  <div
                    className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 transition ${
                      isSelected
                        ? "border-sky-500/60 bg-sky-950/30"
                        : "border-transparent hover:border-zinc-800 hover:bg-zinc-900/80"
                    }`}
                    style={{ paddingLeft: `${8 + Math.min(item.level * 12, 180)}px` }}
                    onMouseDown={(e) => handleOutlineRowMouseDown(e, item.id)}
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
                      onFocus={() => {
                        if (!selectedIds.includes(item.id)) selectOnly(item.id);
                      }}
                      placeholder={`${hierarchyLabelForLevel(item.level)}…`}
                      className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRow(index);
                      }}
                      disabled={outlineItems.length <= 1}
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
          {selectedItems.length > 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Selected box size
                {selectedItems.length > 1 ? ` (${selectedItems.length} boxes)` : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] text-zinc-500">Width (px)</span>
                  <input
                    type="number"
                    min={60}
                    max={400}
                    step={1}
                    value={widthDraft ?? String(selectedWidth)}
                    onFocus={() => setWidthDraft(String(selectedWidth))}
                    onChange={(e) => handleWidthInputChange(e.target.value)}
                    onBlur={(e) => commitWidthDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] text-zinc-500">Height (px)</span>
                  <input
                    type="number"
                    min={28}
                    max={200}
                    step={1}
                    value={heightDraft ?? String(selectedHeight)}
                    onFocus={() => setHeightDraft(String(selectedHeight))}
                    onChange={(e) => handleHeightInputChange(e.target.value)}
                    onBlur={(e) => commitHeightDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={clearSelectedBoxSize}
                className="mt-2 w-full rounded-md border border-zinc-700 px-2 py-1 text-[10px] font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                Reset size & position
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={addRowAtEnd}
            className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            + Add step
          </button>
          <button
            type="button"
            onClick={deleteSelectedRows}
            disabled={!canDelete}
            className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete selected
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-2">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasPointerDown}
            className="mx-auto block max-w-full cursor-grab rounded-lg border border-zinc-700 bg-white shadow-sm active:cursor-grabbing"
          />
        </div>
      </div>
    </div>
  );
});
