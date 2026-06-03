import type { ReactNode } from "react";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import type { MetricTuple, OutputRow } from "@/app/types";

export const MAX_PREVIEW_ROWS = 250;

export function ResultPanel({
  canShow,
  rows,
  columns,
  previewRows,
  metrics,
  metricRows,
  emptyText,
  note,
  onExport,
  renderCell
}: {
  canShow: boolean;
  rows: OutputRow[];
  columns: string[];
  previewRows: OutputRow[];
  metrics: MetricTuple[];
  metricRows?: MetricTuple[][];
  emptyText: string;
  note?: string;
  onExport: () => void;
  renderCell: (row: OutputRow, column: string) => ReactNode;
}) {
  const visibleMetricRows = metricRows ?? [metrics];

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-panel">
      <div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black text-field">结果</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <h2 className="text-xl font-black text-slate-950">{canShow ? `${rows.length.toLocaleString("zh-CN")} 条` : "等待字段"}</h2>
            <div className="flex min-w-0 flex-col gap-2 overflow-hidden pb-0.5">
              {visibleMetricRows.map((metricRow, index) => (
                <div key={index} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {metricRow.map(([label, value, unit]) => (
                    <InlineMetric key={label} label={label} value={value} unit={unit} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-500">
            <Search size={15} />
            预览 {MAX_PREVIEW_ROWS} 行
          </div>
          {note ? <div className="inline-flex h-9 items-center rounded-full bg-teal-50 px-3 text-xs font-bold text-field">{note}</div> : null}
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            type="button"
            disabled={rows.length === 0}
            onClick={onExport}
            title="导出结果"
          >
            <Download size={15} />
            导出 Excel
          </button>
        </div>
      </div>

      {canShow && rows.length > 0 ? (
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-black text-slate-600">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row) => (
                <tr key={row.id} className="hover:bg-teal-50/40">
                  {columns.map((column) => (
                    <td key={column} className="max-w-[260px] truncate px-4 py-3 text-slate-700">
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-[260px] place-items-center p-8">
          <div className="grid justify-items-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <FileSpreadsheet size={30} />
            </div>
            <p className="text-sm font-bold text-slate-500">{emptyText}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function InlineMetric({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
      {label}
      <span>
        <strong className="text-slate-950">{value.toLocaleString("zh-CN")}</strong>
        {unit ? <span className="text-slate-500"> {unit}</span> : null}
      </span>
    </span>
  );
}
