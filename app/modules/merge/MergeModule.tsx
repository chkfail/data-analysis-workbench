import { useMemo } from "react";
import { Download, FileSpreadsheet, Loader2, Plus, Upload, X } from "lucide-react";
import type { MergeTableRuntime, MetricTuple, OutputRow, TableSlot, WorkbookState } from "@/app/types";
import { FieldSelect } from "@/app/components/FieldSelect";
import { MAX_PREVIEW_ROWS, ResultPanel } from "@/app/components/ResultPanel";
import { TableCard } from "@/app/components/TableCard";
import { getTableTone, TableTitleChip } from "@/app/components/TableTitleChip";
import type { MergeResult } from "@/app/lib/merge";

export function MergeModule({
  baseBook,
  tables,
  baseColumns,
  fieldMapping,
  deduplicate,
  loadingSlot,
  result,
  onFile,
  onBaseSheet,
  onAddTable,
  onAddFiles,
  onRemoveTable,
  onFieldMapping,
  onRemoveFieldMapping,
  onDeduplicate,
  onExport,
  isAddingFiles,
}: {
  baseBook: WorkbookState | null;
  tables: MergeTableRuntime[];
  baseColumns: string[];
  fieldMapping: Record<string, string>;
  deduplicate: boolean;
  loadingSlot: TableSlot | null;
  result: MergeResult;
  isAddingFiles: boolean;
  onFile: (slot: TableSlot, file?: File) => void;
  onBaseSheet: (sheet: string) => void;
  onAddTable: () => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveTable: (slot: TableSlot) => void;
  onFieldMapping: (sourceField: string, baseField: string) => void;
  onRemoveFieldMapping: (sourceField: string) => void;
  onDeduplicate: (value: boolean) => void;
  onExport: () => void;
}) {
  const canMerge = baseColumns.length > 0 && result.sourceTableCount > 0;
  const configuredMappings = Object.entries(fieldMapping);
  const unmatchedFieldSources = useMemo(() => {
    const map = new Map<string, string[]>();
    result.unmatchedFields.forEach((field) => {
      const sources = tables
        .filter((table) => table.columns.includes(field))
        .map((table) => table.title);
      map.set(field, sources);
    });
    return map;
  }, [result.unmatchedFields, tables]);

  return (
    <>
      <section className="flex items-stretch gap-4 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
        <div className="h-[220px] w-[min(82vw,500px)] shrink-0 lg:w-[calc((100%_-_170px_-_2rem)/2)] lg:min-w-[420px]">
          <TableCard
            slot="merge-base"
            title="基准表"
            workbook={baseBook}
            columns={baseColumns}
            loading={loadingSlot === "merge-base"}
            controlGridClass="sm:grid-cols-1"
            controls={null}
            hideColumnPreview
            onFile={onFile}
            onSheet={(_, sheet) => onBaseSheet(sheet)}
          />
        </div>

        {tables.map((table) => (
          <div
            key={table.id}
            className="h-[220px] w-[min(82vw,500px)] shrink-0 lg:w-[calc((100%_-_170px_-_2rem)/2)] lg:min-w-[420px]"
          >
            <MergeTableCard
              table={table}
              loading={loadingSlot === table.id}
              removable={tables.length > 1}
              onFile={onFile}
              onRemove={onRemoveTable}
            />
          </div>
        ))}

        <label
          className={[
            "group grid h-[220px] w-[min(42vw,170px)] shrink-0 place-items-center gap-1 rounded-card border border-dashed border-slate-300 bg-white/50 text-slate-500 transition lg:w-[170px]",
            baseBook
              ? "cursor-pointer hover:border-field hover:bg-field-soft hover:text-field"
              : "cursor-not-allowed opacity-60",
          ].join(" ")}
          aria-label="批量添加参与表"
          title={baseBook ? "批量添加参与表" : "请先上传基准表"}
        >
          {isAddingFiles ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <Plus size={24} className={baseBook ? "transition group-hover:rotate-90" : ""} />
          )}
          <span className="text-sm font-bold">
            {isAddingFiles ? "解析中" : "批量添加表"}
          </span>
          <span className="px-2 text-center text-[10px] font-semibold leading-tight opacity-70">
            {baseBook ? "按住 Ctrl/Cmd 多选" : "请先上传基准表"}
          </span>
          <input
            className="sr-only"
            accept=".xlsx,.csv"
            type="file"
            multiple
            disabled={!baseBook}
            onChange={(event) => onAddFiles(event.target.files)}
          />
        </label>
      </section>

      <section className="panel p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-bold tracking-wide text-field">字段映射</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              来源字段会按名称自动匹配基准字段；未匹配的字段可手动指定对应关系。
            </p>

            {configuredMappings.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {configuredMappings.map(([sourceField, baseField]) => (
                  <span
                    key={sourceField}
                    className="inline-flex items-center gap-1.5 rounded-full bg-field-soft px-3 py-1.5 text-xs font-bold text-field ring-1 ring-inset ring-field/15"
                  >
                    {sourceField} → {baseField}
                    <button
                      className="grid h-4 w-4 place-items-center rounded-full transition hover:bg-field/15"
                      type="button"
                      onClick={() => onRemoveFieldMapping(sourceField)}
                      title="移除映射"
                      aria-label="移除映射"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {result.unmatchedFields.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {result.unmatchedFields.map((field) => (
                  <div
                    key={field}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-paper/70 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {field}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        来自 {unmatchedFieldSources.get(field)?.join("、")}
                      </p>
                    </div>
                    <div className="w-44 shrink-0">
                      <FieldSelect
                        label="映射为"
                        disabled={false}
                        value={fieldMapping[field] ?? ""}
                        placeholder="选择基准字段"
                        options={baseColumns}
                        onChange={(value) => onFieldMapping(field, value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : configuredMappings.length === 0 ? (
              <div className="mt-3 grid min-h-16 place-items-center rounded-2xl border border-dashed border-slate-300 bg-paper/70 text-xs font-semibold text-slate-400">
                所有字段已自动匹配或尚未导入参与表
              </div>
            ) : null}
          </div>

          <label className="flex h-11 cursor-pointer select-none items-center gap-2.5 self-start rounded-2xl bg-slate-100 px-4 ring-1 ring-inset ring-slate-200/70 transition hover:bg-slate-200/70">
            <input
              className="peer sr-only"
              type="checkbox"
              checked={deduplicate}
              onChange={(event) => onDeduplicate(event.target.checked)}
            />
            <span
              className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-field peer-checked:after:translate-x-4"
              aria-hidden
            />
            <span className="text-sm font-bold text-slate-500 transition peer-checked:text-slate-800">
              整行去重
            </span>
          </label>
        </div>
      </section>

      <ResultPanel
        canShow={canMerge}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={
          canMerge
            ? "当前字段没有结果"
            : "导入基准表和至少一张参与表"
        }
        metrics={[
          ["基准字段", baseColumns.length, "个"],
          ["基准数据", result.baseRowCount, "行"],
          ["参与表", result.sourceTableCount, "张"],
          ["参与表行数", result.sourceRowCount, "行"],
          ["原始行数", result.baseRowCount + result.sourceRowCount, "行"],
          ["合并行数", result.rows.length, "行"],
          ...(deduplicate
            ? [["去重移除", result.duplicateRowCount, "行"] as MetricTuple]
            : []),
          ["未匹配字段", result.unmatchedFields.length, "个"],
        ]}
        onExport={onExport}
        renderCell={(row: OutputRow, column: string) => row.data[column]}
      />
    </>
  );
}

function MergeTableCard({
  table,
  loading,
  removable,
  onFile,
  onRemove,
}: {
  table: MergeTableRuntime;
  loading: boolean;
  removable: boolean;
  onFile: (slot: TableSlot, file?: File) => void;
  onRemove: (slot: TableSlot) => void;
}) {
  const sheetNames = table.workbook ? Object.keys(table.workbook.sheets) : [];
  const tone = getTableTone(table.title);

  return (
    <article className="panel flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <TableTitleChip title={table.title} />
          <h2 className="mt-1 truncate text-lg font-bold text-slate-950">
            {table.workbook?.name ?? "未导入"}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
            {table.rows.length.toLocaleString("zh-CN")} 行
          </span>
          {table.workbook ? <FileInput compact slot={table.id} tone={tone} onFile={onFile} /> : null}
          {removable ? (
            <button
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              type="button"
              onClick={() => onRemove(table.id)}
              title="移除此表"
              aria-label="移除此表"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>
      </div>

      {!table.workbook ? (
        <div className="flex flex-1 px-4 pb-4">
          <label className={`group flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed text-sm font-bold transition ${tone.upload}`}>
            {loading ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} className="transition group-hover:-translate-y-0.5" />}
            <span>{loading ? "解析中" : "导入表格"}</span>
            <input
              className="sr-only"
              accept=".xlsx,.csv"
              type="file"
              onChange={(event) => onFile(table.id, event.target.files?.[0])}
            />
          </label>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2 p-4 pt-0 text-xs font-bold text-slate-500">
          工作表（全部合并）
          <div className="min-h-0 overflow-auto rounded-2xl border border-line bg-paper/70 p-2">
            <div className="flex flex-wrap gap-2">
              {sheetNames.map((sheet) => (
                <span
                  key={sheet}
                  className={`chip max-w-52 ${tone.chipOff}`}
                  title={sheet}
                >
                  {sheet}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
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
  tone: ReturnType<typeof getTableTone>;
  onFile: (slot: TableSlot, file?: File) => void;
}) {
  return (
    <label className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-bold shadow-sm transition ${tone.action}`}>
      <Upload size={13} />
      {compact ? "更换" : "导入"}
      <input
        className="sr-only"
        accept=".xlsx,.csv"
        type="file"
        onChange={(event) => onFile(slot, event.target.files?.[0])}
      />
    </label>
  );
}
