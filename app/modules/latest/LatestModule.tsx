import type { OutputRow, TableSlot, WorkbookState } from "@/app/types";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";
import { TableCard } from "@/app/components/TableCard";

export function LatestModule({
  workbook,
  columns,
  sourceRowsCount,
  baseField,
  timeField,
  loadingSlot,
  result,
  onFile,
  onSheet,
  onBaseField,
  onTimeField,
  onExport,
}: {
  workbook: WorkbookState | null;
  columns: string[];
  sourceRowsCount: number;
  baseField: string;
  timeField: string;
  loadingSlot: TableSlot | null;
  result: {
    rows: OutputRow[];
    columns: string[];
    groups: number;
    ignored: number;
  };
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onBaseField: (field: string) => void;
  onTimeField: (field: string) => void;
  onExport: () => void;
}) {
  const canPickLatest = Boolean(workbook && baseField && timeField);

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_minmax(420px,1.5fr)]">
        <TableCard
          slot="latest"
          title="数据表"
          workbook={workbook}
          columns={columns}
          loading={loadingSlot === "latest"}
          controlGridClass="sm:grid-cols-1"
          hideColumnPreview
          sheetAsChips
          controls={undefined}
          onFile={onFile}
          onSheet={onSheet}
        />

        <article className="rounded-[28px] border border-white/70 bg-white p-5 shadow-panel">
          <div className="grid content-start gap-5">
            <FieldChipPicker
              title="基准字段"
              columns={columns}
              selected={baseField}
              emptyText="导入后选择分组字段"
              onToggle={onBaseField}
            />
            <FieldChipPicker
              title="时间字段"
              columns={columns}
              selected={timeField}
              emptyText="导入后选择排序字段"
              onToggle={onTimeField}
            />
          </div>
        </article>
      </section>

      <ResultPanel
        canShow={canPickLatest}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={
          canPickLatest
            ? "当前字段没有结果"
            : "导入表格，选择基准字段和时间字段"
        }
        metrics={[
          ["原始行数", sourceRowsCount],
          ["基准数量", result.groups],
          ["取最新行", result.rows.length],
          ["空基准忽略", result.ignored],
        ]}
        onExport={onExport}
        renderCell={(row, column) => row.data[column]}
      />
    </>
  );
}

function FieldChipPicker({
  title,
  columns,
  selected,
  emptyText,
  onToggle,
}: {
  title: string;
  columns: string[];
  selected: string;
  emptyText: string;
  onToggle: (field: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-black text-field">{title}</p>
      <div className="max-h-44 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
        {columns.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <button
                key={`${title}-${column}`}
                className={[
                  "max-w-48 truncate rounded-full px-3 py-1.5 text-xs font-black transition",
                  selected === column
                    ? "bg-field text-white shadow-lg shadow-teal-900/15"
                    : "bg-white text-slate-500 hover:bg-teal-50 hover:text-field",
                ].join(" ")}
                type="button"
                onClick={() => onToggle(selected === column ? "" : column)}
                title={column}
              >
                {column}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid min-h-20 place-items-center rounded-xl text-xs font-bold text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}
