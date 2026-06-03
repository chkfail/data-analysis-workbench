import type { ReactNode } from "react";
import { Loader2, Upload } from "lucide-react";
import type { TableSlot, WorkbookState } from "@/app/types";
import { FieldSelect } from "@/app/components/FieldSelect";

export function TableCard({
  slot,
  title,
  workbook,
  columns,
  loading,
  controlGridClass,
  controls,
  headerAction,
  hideColumnPreview,
  sheetAsChips,
  onFile,
  onSheet,
}: {
  slot: TableSlot;
  title: string;
  workbook: WorkbookState | null;
  columns: string[];
  loading: boolean;
  controlGridClass: string;
  controls: ReactNode;
  headerAction?: ReactNode;
  hideColumnPreview?: boolean;
  sheetAsChips?: boolean;
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
}) {
  const rowCount = workbook
    ? (workbook.sheets[workbook.activeSheet]?.length ?? 0)
    : 0;
  const columnPreview = columns.slice(0, 5);

  return (
    <article className="rounded-[28px] border border-white/70 bg-white shadow-panel">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-black text-field">{title}</p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-950">
            {workbook?.name ?? "未导入"}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            {rowCount.toLocaleString("zh-CN")} 行
          </span>
          {workbook ? <FileInput compact slot={slot} onFile={onFile} /> : null}
          {headerAction}
        </div>
      </div>

      {!workbook ? (
        <div className="px-5">
          <label className="group flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm font-black text-slate-500 transition hover:border-field hover:bg-teal-50 hover:text-field">
            {loading ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <Upload size={22} />
            )}
            <span>{loading ? "解析中" : "导入 Excel / CSV"}</span>
            <input
              className="sr-only"
              accept=".xlsx,.xls,.csv"
              type="file"
              onChange={(event) => onFile(slot, event.target.files?.[0])}
            />
          </label>
        </div>
      ) : null}

      <div className={`grid gap-3 p-5 ${controlGridClass}`}>
        {sheetAsChips && workbook ? (
          <div className="grid gap-2 text-xs font-black text-slate-500">
            工作表
            <div className="max-h-28 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
              <div className="flex flex-wrap gap-2">
                {Object.keys(workbook.sheets).map((sheet) => (
                  <button
                    key={sheet}
                    className={[
                      "max-w-48 truncate rounded-full px-3 py-1.5 text-xs font-black transition",
                      workbook.activeSheet === sheet
                        ? "bg-field text-white shadow-lg shadow-teal-900/15"
                        : "bg-white text-slate-500 hover:bg-teal-50 hover:text-field",
                    ].join(" ")}
                    type="button"
                    onClick={() => onSheet(slot, sheet)}
                    title={sheet}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <FieldSelect
            label="工作表"
            disabled={!workbook}
            value={workbook?.activeSheet ?? ""}
            onChange={(value) => onSheet(slot, value)}
            placeholder="待导入"
            options={workbook ? Object.keys(workbook.sheets) : []}
          />
        )}
        {controls}
      </div>

      {!hideColumnPreview ? (
        <div className="flex min-h-14 flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
          {columnPreview.length > 0 ? (
            <>
              {columnPreview.map((column) => (
                <span
                  key={column}
                  className="max-w-40 truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                >
                  {column}
                </span>
              ))}
              {columns.length > columnPreview.length ? (
                <span className="text-xs font-bold text-slate-400">
                  +{columns.length - columnPreview.length}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-xs font-bold text-slate-400">等待字段</span>
          )}
        </div>
      ) : null}
    </article>
  );
}

function FileInput({
  compact,
  slot,
  onFile,
}: {
  compact?: boolean;
  slot: TableSlot;
  onFile: (slot: TableSlot, file?: File) => void;
}) {
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-field px-3 text-xs font-black text-white transition hover:bg-teal-700">
      <Upload size={13} />
      {compact ? "更换" : "导入"}
      <input
        className="sr-only"
        accept=".xlsx,.xls,.csv"
        type="file"
        onChange={(event) => onFile(slot, event.target.files?.[0])}
      />
    </label>
  );
}
