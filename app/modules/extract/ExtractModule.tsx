import type { MetricTuple, OutputRow, TableSlot, WorkbookState } from "@/app/types";
import type { ExtractTemplateId } from "@/app/lib/extract";
import { EXTRACT_TEMPLATES } from "@/app/lib/extract";
import { Loader2, Upload } from "lucide-react";
import { FieldSelect } from "@/app/components/FieldSelect";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";

export function ExtractModule({
  workbook,
  columns,
  sourceRowsCount,
  sourceFields,
  templates,
  customPattern,
  loadingSlot,
  result,
  onFile,
  onSheet,
  onSourceField,
  onTemplate,
  onCustomPattern,
  onExport
}: {
  workbook: WorkbookState | null;
  columns: string[];
  sourceRowsCount: number;
  sourceFields: string[];
  templates: ExtractTemplateId[];
  customPattern: string;
  loadingSlot: TableSlot | null;
  result: { rows: OutputRow[]; columns: string[]; extracted: number; extractedByColumn: Record<string, number>; error: string };
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onSourceField: (field: string) => void;
  onTemplate: (template: ExtractTemplateId) => void;
  onCustomPattern: (pattern: string) => void;
  onExport: () => void;
}) {
  const canExtract = Boolean(workbook && sourceFields.length > 0 && templates.length > 0 && !result.error && (!templates.includes("custom") || customPattern.trim()));
  const rowCount = workbook ? workbook.sheets[workbook.activeSheet]?.length ?? 0 : 0;
  const extractedMetrics = Object.entries(result.extractedByColumn).map(([column, count]) => [column, count, "行"] as MetricTuple);
  const templateOptions: Array<{ id: ExtractTemplateId; title: string }> = [
    ...Object.entries(EXTRACT_TEMPLATES).map(([id, config]) => ({ id: id as ExtractTemplateId, title: config.title })),
    { id: "custom", title: "自定义正则" }
  ];

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(420px,1fr)_minmax(360px,0.9fr)]">
        <article className="panel overflow-hidden">
          <div className="grid gap-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-wide text-field">数据表</p>
                <h2 className="mt-1 truncate text-lg font-bold text-slate-950">{workbook?.name ?? "未导入"}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-paper px-3 py-1 font-mono text-xs font-semibold text-slate-500 ring-1 ring-inset ring-line">{rowCount.toLocaleString("zh-CN")} 行</span>
                {workbook ? <FileInput compact slot="extract" onFile={onFile} /> : null}
              </div>
            </div>

            {!workbook ? (
              <FileDrop loading={loadingSlot === "extract"} onFile={onFile} />
            ) : (
              <div className="grid gap-3">
                <FieldSelect
                  label="工作表"
                  disabled={!workbook}
                  value={workbook.activeSheet}
                  onChange={(value) => onSheet("extract", value)}
                  placeholder="待导入"
                  options={Object.keys(workbook.sheets)}
                />
                <div className="grid gap-2 text-xs font-bold text-slate-500">
                  源列
                  <div className="max-h-24 overflow-auto rounded-2xl border border-line bg-paper/70 p-2">
                    <div className="flex flex-wrap gap-2">
                      {columns.map((column) => (
                        <button
                          key={column}
                          className={[
                            "chip",
                            sourceFields.includes(column) ? "chip-on" : "chip-off"
                          ].join(" ")}
                          type="button"
                          onClick={() => onSourceField(column)}
                          title={column}
                        >
                          {column}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        <article className="panel p-5">
          <div className="grid content-start gap-4">
            <div>
              <p className="text-xs font-bold tracking-wide text-field">提取规则</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">模板</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {templateOptions.map((option) => (
                <button
                  key={option.id}
                  className={[
                    "h-9 rounded-full px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                    templates.includes(option.id) ? "chip-on" : "bg-paper text-slate-500 ring-1 ring-inset ring-line hover:bg-field-soft hover:text-field hover:ring-field/30"
                  ].join(" ")}
                  type="button"
                  disabled={columns.length === 0}
                  onClick={() => onTemplate(option.id)}
                >
                  {option.title}
                </button>
              ))}
            </div>
            {templates.includes("custom") ? (
              <label className="grid gap-2 text-xs font-bold text-slate-500">
                自定义正则
                <input
                  className="h-11 rounded-xl border border-line bg-white px-3 font-mono text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-field focus:ring-4 focus:ring-field-soft"
                  value={customPattern}
                  onChange={(event) => onCustomPattern(event.target.value)}
                  placeholder="例如：(?<金额>\\d+(?:\\.\\d{1,2})?)元"
                />
              </label>
            ) : null}
          </div>
        </article>
      </section>

      <ResultPanel
        canShow={canExtract}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={result.error || (canExtract ? "当前字段没有结果" : "导入表格，选择源列和提取模板")}
        metrics={[
          ["原始行数", sourceRowsCount, "行"],
          ...extractedMetrics,
          ["追加字段", Math.max(result.columns.length - columns.length, 0), "个"]
        ]}
        note="结果已追加到原表"
        onExport={onExport}
        renderCell={(row, column) => row.data[column]}
      />
    </>
  );
}

function FileDrop({ loading, onFile }: { loading: boolean; onFile: (slot: TableSlot, file?: File) => void }) {
  return (
    <label className="group flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-paper/70 text-sm font-bold text-slate-500 transition hover:border-field hover:bg-field-soft hover:text-field">
      {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} className="transition group-hover:-translate-y-0.5" />}
      <span>{loading ? "解析中" : "导入 Excel / CSV"}</span>
      <input className="sr-only" accept=".xlsx,.xls,.csv" type="file" onChange={(event) => onFile("extract", event.target.files?.[0])} />
    </label>
  );
}

function FileInput({ compact, slot, onFile }: { compact?: boolean; slot: TableSlot; onFile: (slot: TableSlot, file?: File) => void }) {
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-field px-3 text-xs font-bold text-white shadow-sm shadow-field/40 transition hover:bg-field-deep">
      <Upload size={13} />
      {compact ? "更换" : "导入"}
      <input className="sr-only" accept=".xlsx,.xls,.csv" type="file" onChange={(event) => onFile(slot, event.target.files?.[0])} />
    </label>
  );
}
