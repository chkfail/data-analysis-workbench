import type { ReactNode } from "react";
import { Hash, Loader2, Upload } from "lucide-react";
import type { TableSlot, WorkbookState } from "@/app/types";
import { FieldSelect } from "@/app/components/FieldSelect";
import { getTableTone, TableTitleChip, type TableTone } from "@/app/components/TableTitleChip";

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
  const tone = getTableTone(title);

  return (
    <article className="panel h-full">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <TableTitleChip title={title} />
          <h2 className="mt-1 truncate text-lg font-bold text-slate-950">
            {workbook?.name ?? "未导入"}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
            {rowCount.toLocaleString("zh-CN")} 行
          </span>
          {workbook ? <FileInput compact slot={slot} tone={tone} onFile={onFile} /> : null}
          {headerAction}
        </div>
      </div>

      {!workbook ? (
        <div className="px-5 pb-5">
          <label className={`group flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed text-sm font-bold transition ${tone.upload}`}>
            {loading ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <Upload size={22} className="transition group-hover:-translate-y-0.5" />
            )}
            <span>{loading ? "解析中" : "导入表格"}</span>
            <input
              className="sr-only"
              accept=".xlsx,.xls,.csv"
              type="file"
              onChange={(event) => onFile(slot, event.target.files?.[0])}
            />
          </label>
        </div>
      ) : null}

      {workbook ? (
        <div className={`grid gap-3 p-5 ${controlGridClass}`}>
          {sheetAsChips ? (
            <div className="grid gap-2 text-xs font-bold text-slate-500">
              工作表
              <div className="max-h-28 overflow-auto rounded-2xl border border-line bg-paper/70 p-2">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(workbook.sheets).map((sheet) => (
                    <button
                      key={sheet}
                      className={[
                        "chip",
                        workbook.activeSheet === sheet ? tone.chipOn : tone.chipOff,
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
              disabled={false}
              value={workbook.activeSheet}
              onChange={(value) => onSheet(slot, value)}
              placeholder="待导入"
              options={Object.keys(workbook.sheets)}
              tone={tone}
            />
          )}
          {controls}
        </div>
      ) : null}

      {!hideColumnPreview && workbook ? (
        <div className="flex min-h-14 flex-wrap items-center gap-2 border-t border-line/70 px-5 py-4">
          {columnPreview.length > 0 ? (
            <>
              {columnPreview.map((column) => (
                <span
                  key={column}
                  className={`inline-flex max-w-40 min-w-0 items-center gap-1.5 truncate rounded-full px-3 py-1 text-xs font-semibold ${tone.chipOff}`}
                >
                  <Hash size={12} className="shrink-0" />
                  {column}
                </span>
              ))}
              {columns.length > columnPreview.length ? (
                <span className="font-mono text-xs font-semibold text-slate-400">
                  +{columns.length - columnPreview.length}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-xs font-semibold text-slate-400">
              等待字段
            </span>
          )}
        </div>
      ) : null}
    </article>
  );
}

function FileInput({
  compact,
  slot,
  tone,
  onFile,
}: {
  compact?: boolean;
  slot: TableSlot;
  tone: TableTone;
  onFile: (slot: TableSlot, file?: File) => void;
}) {
  return (
    <label className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold shadow-sm transition ${tone.action}`}>
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
