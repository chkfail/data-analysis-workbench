import type { ReactNode } from "react";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import type { MetricTuple, OutputRow } from "@/app/types";
import { MetricChip } from "@/app/components/MetricChip";

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
  exportLabel,
  secondaryExport,
  renderCell,
  getRowClassName,
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
  exportLabel?: string;
  secondaryExport?: { label: string; onClick: () => void };
  renderCell: (row: OutputRow, column: string) => ReactNode;
  getRowClassName?: (row: OutputRow) => string;
}) {
  const visibleMetricRows = metricRows ?? [metrics];

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-3 border-b border-line/70 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-field">结果</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <h2 className="text-xl font-black text-slate-950">
              {canShow
                ? `${rows.length.toLocaleString("zh-CN")} 条`
                : "等待字段"}
            </h2>
            <div className="flex min-w-0 flex-col gap-2 overflow-hidden pb-0.5">
              {visibleMetricRows.map((metricRow, index) => (
                <div
                  key={index}
                  className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
                >
                  {metricRow.map(([label, value, unit]) => (
                    <MetricChip
                      key={label}
                      label={label}
                      value={value}
                      unit={unit}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-full bg-paper px-3 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-line">
            <Search size={15} />
            预览 {MAX_PREVIEW_ROWS} 行
          </div>
          {note ? (
            <div className="inline-flex h-9 items-center rounded-full bg-field-soft px-3 text-xs font-bold text-field ring-1 ring-inset ring-field/15">
              {note}
            </div>
          ) : null}
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-field px-4 text-xs font-bold text-white shadow-lg shadow-field/30 transition hover:bg-field-deep disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            type="button"
            disabled={rows.length === 0}
            onClick={onExport}
            title="导出结果"
          >
            <Download size={15} />
            {exportLabel ?? "导出 Excel"}
          </button>
          {secondaryExport ? (
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:border-field/40 hover:bg-field-soft hover:text-field disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-300 disabled:shadow-none"
              type="button"
              disabled={rows.length === 0}
              onClick={secondaryExport.onClick}
              title={secondaryExport.label}
            >
              <Download size={15} />
              {secondaryExport.label}
            </button>
          ) : null}
        </div>
      </div>

      {canShow && rows.length > 0 ? (
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="sticky top-0 z-10 border-b border-line bg-paper px-4 py-3 text-xs font-bold text-slate-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {previewRows.map((row) => (
                <tr
                  key={row.id}
                  className={`${getRowClassName?.(row) ?? "even:bg-paper/40"} transition-colors hover:brightness-[0.97]`}
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="max-w-[260px] truncate px-4 py-2.5 text-slate-700"
                    >
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
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-field/25 bg-field-soft text-field">
              <FileSpreadsheet size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-500">{emptyText}</p>
          </div>
        </div>
      )}
    </section>
  );
}

