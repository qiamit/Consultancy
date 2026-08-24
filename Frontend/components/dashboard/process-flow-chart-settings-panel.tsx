"use client";

import {
  PROCESS_FLOW_ARROW_HEADS,
  PROCESS_FLOW_ARROW_ROUTINGS,
  PROCESS_FLOW_HIERARCHY_LAYOUTS,
  PROCESS_FLOW_LEVEL_LABELS,
  type ProcessFlowChartSettings,
} from "@backend/modules/bis/process-flow-chart-settings";

const fieldClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

const labelClass = "text-[10px] font-semibold uppercase tracking-wide text-zinc-400";

const HIERARCHY_LAYOUT_LABELS: Record<(typeof PROCESS_FLOW_HIERARCHY_LAYOUTS)[number], string> = {
  tree: "Tree — parent to direct child",
  level_rows: "Level rows — same level side by side",
};

const ARROW_ROUTING_LABELS: Record<(typeof PROCESS_FLOW_ARROW_ROUTINGS)[number], string> = {
  straight: "Straight",
  elbow: "Elbow (org chart)",
};

const ARROW_HEAD_LABELS: Record<(typeof PROCESS_FLOW_ARROW_HEADS)[number], string> = {
  filled: "Filled arrowhead",
  open: "Open arrowhead",
  none: "Line only",
};

export function ProcessFlowChartSettingsPanel({
  settings,
  onChange,
}: {
  settings: ProcessFlowChartSettings;
  onChange: (patch: Partial<ProcessFlowChartSettings>) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Chart Settings</h3>

      <section className="mb-5 space-y-3">
        <p className={labelClass}>Hierarchy layout</p>
        <select
          value={settings.hierarchy_layout}
          onChange={(e) =>
            onChange({
              hierarchy_layout: e.target.value as ProcessFlowChartSettings["hierarchy_layout"],
            })
          }
          className={fieldClass}
        >
          {PROCESS_FLOW_HIERARCHY_LAYOUTS.map((value) => (
            <option key={value} value={value}>
              {HIERARCHY_LAYOUT_LABELS[value]}
            </option>
          ))}
        </select>

        <p className="text-[11px] leading-relaxed text-zinc-500">
          Level labels used in sidebar and boxes:
        </p>
        <ul className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
          {PROCESS_FLOW_LEVEL_LABELS.map((label, index) => (
            <li key={label} className="text-[11px] text-zinc-300">
              <span className="font-semibold text-zinc-400">L{index + 1}</span> — {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-5 space-y-3 border-t border-zinc-800 pt-4">
        <p className={labelClass}>Arrow routing</p>
        <select
          value={settings.arrow_routing}
          onChange={(e) =>
            onChange({
              arrow_routing: e.target.value as ProcessFlowChartSettings["arrow_routing"],
            })
          }
          className={fieldClass}
        >
          {PROCESS_FLOW_ARROW_ROUTINGS.map((value) => (
            <option key={value} value={value}>
              {ARROW_ROUTING_LABELS[value]}
            </option>
          ))}
        </select>

        <p className={labelClass}>Arrow head</p>
        <select
          value={settings.arrow_head}
          onChange={(e) =>
            onChange({ arrow_head: e.target.value as ProcessFlowChartSettings["arrow_head"] })
          }
          className={fieldClass}
        >
          {PROCESS_FLOW_ARROW_HEADS.map((value) => (
            <option key={value} value={value}>
              {ARROW_HEAD_LABELS[value]}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={`${labelClass} mb-1`}>Arrow color</p>
            <input
              type="color"
              value={settings.arrow_color}
              onChange={(e) => onChange({ arrow_color: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-zinc-700 bg-zinc-950"
            />
          </div>
          <div>
            <p className={`${labelClass} mb-1`}>Box border color</p>
            <input
              type="color"
              value={settings.box_stroke_color}
              onChange={(e) => onChange({ box_stroke_color: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-zinc-700 bg-zinc-950"
            />
          </div>
        </div>

        <div>
          <p className={`${labelClass} mb-1`}>Arrow width ({settings.arrow_width}px)</p>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={settings.arrow_width}
            onChange={(e) => onChange({ arrow_width: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <p className={`${labelClass} mb-1`}>Box border width ({settings.box_stroke_width}px)</p>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={settings.box_stroke_width}
            onChange={(e) => onChange({ box_stroke_width: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={settings.arrow_dashed}
            onChange={(e) => onChange({ arrow_dashed: e.target.checked })}
            className="rounded border-zinc-600"
          />
          Dashed arrows
        </label>
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-4">
        <p className={labelClass}>Spacing</p>
        <div>
          <p className={`${labelClass} mb-1`}>Row gap ({settings.row_gap}px)</p>
          <input
            type="range"
            min={12}
            max={64}
            step={2}
            value={settings.row_gap}
            onChange={(e) => onChange({ row_gap: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <p className={`${labelClass} mb-1`}>Column gap ({settings.col_gap}px)</p>
          <input
            type="range"
            min={8}
            max={48}
            step={2}
            value={settings.col_gap}
            onChange={(e) => onChange({ col_gap: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <p className={`${labelClass} mb-1`}>Box height ({settings.box_height}px)</p>
          <input
            type="range"
            min={36}
            max={96}
            step={2}
            value={settings.box_height}
            onChange={(e) => onChange({ box_height: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <p className={`${labelClass} mb-1`}>Box min width ({settings.min_box_width}px)</p>
          <input
            type="range"
            min={90}
            max={220}
            step={5}
            value={settings.min_box_width}
            onChange={(e) => onChange({ min_box_width: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </section>
    </div>
  );
}
