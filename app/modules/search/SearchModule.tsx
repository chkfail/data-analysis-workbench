import { Download, FileSpreadsheet, Loader2, Plus, Search, Upload, X } from "lucide-react";
import type { OutputRow, SearchTableRuntime, TableSlot } from "@/app/types";
import { cellMatchesSearch, type SearchMode, type SearchResult } from "@/app/lib/search";
import { ModeButton } from "@/app/components/ModeButton";
import { MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";

export function SearchModule({
  tables,
  query,
  mode,
  loadingSlot,
  result,
  caseSensitive,
  onQuery,
  onMode,
  onFile,
  onSheet,
  onAddTable,
  onRemoveTable,
  onExport,
}: {
  tables: SearchTableRuntime[];
  query: string;
  mode: SearchMode;
  loadingSlot: TableSlot | null;
  result: SearchResult;
  caseSensitive: boolean;
  onQuery: (query: string) => void;
  onMode: (mode: SearchMode) => void;
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onAddTable: () => void;
  onRemoveTable: (slot: TableSlot) => void;
  onExport: () => void;
}) {
  const canSearch = result.sourceSheetCount > 0 && query.trim().length > 0;

  return (
    <>
      <section className="flex items-stretch gap-4 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
        {tables.map((table) => (
          <div key={table.id} className="h-[220px] w-[min(82vw,500px)] shrink-0 lg:w-[calc((100%_-_170px_-_2rem)/2)] lg:min-w-[420px]">
            <SearchTableCard
              table={table}
              loading={loadingSlot === table.id}
              removable={tables.length > 1}
              onFile={onFile}
              onSheet={onSheet}
              onRemove={onRemoveTable}
            />
          </div>
        ))}

        <button
          className="grid h-[220px] w-[min(42vw,170px)] shrink-0 place-items-center rounded-[28px] border border-dashed border-slate-300 bg-slate-100/70 text-slate-500 transition hover:border-field hover:bg-teal-50 hover:text-field lg:w-[170px]"
          type="button"
          onClick={onAddTable}
          aria-label="添加表"
          title="添加表"
        >
          <span className="inline-flex flex-col items-center gap-2 text-sm font-black">
            <Plus size={24} />
            添加表
          </span>
        </button>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-panel">
        <div className="grid gap-4 lg:grid-cols-[minmax(360px,1fr)_minmax(320px,0.72fr)] lg:items-end">
          <div>
            <p className="text-xs font-black text-field">检索要素</p>
            <label className="mt-3 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-field focus-within:bg-white">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="输入手机号、姓名、账号、关键词..."
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-black text-field">检索方式</p>
            <div className="mt-3 grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
              <ModeButton active={mode === "exact"} onClick={() => onMode("exact")} title="精确" />
              <ModeButton active={mode === "contains"} onClick={() => onMode("contains")} title="包含" />
              <ModeButton active={mode === "fuzzy"} onClick={() => onMode("fuzzy")} title="模糊" />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-panel">
        <div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black text-field">结果</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <h2 className="text-xl font-black text-slate-950">
                {canSearch ? `${result.matchedRowCount.toLocaleString("zh-CN")} 行` : "等待检索"}
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                <InlineMetric label="检索表" value={result.sourceTableCount} unit="张" />
                <InlineMetric label="选中工作表" value={result.sourceSheetCount} unit="个" />
                <InlineMetric label="原始行数" value={result.sourceRowCount} unit="行" />
                <InlineMetric label="命中工作表" value={result.matchedSheetCount} unit="个" />
                <InlineMetric label="命中字段" value={result.matchedFieldCount} unit="个" />
              </div>
            </div>
          </div>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            type="button"
            disabled={result.exportSheets.length === 0}
            onClick={onExport}
            title="导出命中原表"
          >
            <Download size={15} />
            导出命中原表
          </button>
        </div>

        {canSearch && result.sheets.length > 0 ? (
          <div className="grid gap-4 p-5">
            {result.sheets.map((sheet) => (
              <SheetResultTable
                key={sheet.id}
                title={sheet.sheetName}
                subtitle={`${sheet.fileName} / ${sheet.tableTitle}`}
                columns={sheet.columns}
                rows={sheet.rows}
                sourceRowCount={sheet.sourceRowCount}
                hitFieldCount={sheet.hitFieldCount}
                query={query}
                mode={mode}
                caseSensitive={caseSensitive}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[260px] place-items-center p-8">
            <div className="grid justify-items-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <FileSpreadsheet size={30} />
              </div>
              <p className="text-sm font-bold text-slate-500">
                {canSearch ? "没有找到命中内容" : "选择工作表，输入要检索的要素"}
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function SearchTableCard({
  table,
  loading,
  removable,
  onFile,
  onSheet,
  onRemove,
}: {
  table: SearchTableRuntime;
  loading: boolean;
  removable: boolean;
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onRemove: (slot: TableSlot) => void;
}) {
  const sheetNames = table.workbook ? Object.keys(table.workbook.sheets) : [];

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-white/70 bg-white shadow-panel">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-xs font-black text-field">{table.title}</p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-950">
            {table.workbook?.name ?? "未导入"}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            {table.selectedRowCount.toLocaleString("zh-CN")} 行
          </span>
          {table.workbook ? <FileInput compact slot={table.id} onFile={onFile} /> : null}
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
          <label className="group flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm font-black text-slate-500 transition hover:border-field hover:bg-teal-50 hover:text-field">
            {loading ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
            <span>{loading ? "解析中" : "导入 Excel / CSV"}</span>
            <input
              className="sr-only"
              accept=".xlsx,.xls,.csv"
              type="file"
              onChange={(event) => onFile(table.id, event.target.files?.[0])}
            />
          </label>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2 p-4 pt-0 text-xs font-black text-slate-500">
          工作表
          <div className="min-h-0 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
            <div className="flex flex-wrap gap-2">
              {sheetNames.map((sheet) => (
                <button
                  key={sheet}
                  className={[
                    "max-w-52 truncate rounded-full px-3 py-1.5 text-xs font-black transition",
                    table.selectedSheets.includes(sheet)
                      ? "bg-field text-white shadow-lg shadow-teal-900/15"
                      : "bg-white text-slate-500 hover:bg-teal-50 hover:text-field",
                  ].join(" ")}
                  type="button"
                  onClick={() => onSheet(table.id, sheet)}
                  title={sheet}
                >
                  {sheet}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function SheetResultTable({
  title,
  subtitle,
  columns,
  rows,
  sourceRowCount,
  hitFieldCount,
  query,
  mode,
  caseSensitive,
}: {
  title: string;
  subtitle: string;
  columns: string[];
  rows: OutputRow[];
  sourceRowCount: number;
  hitFieldCount: number;
  query: string;
  mode: SearchMode;
  caseSensitive: boolean;
}) {
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950">{title}</h3>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InlineMetric label="命中行" value={rows.length} unit="行" />
          <InlineMetric label="原始行数" value={sourceRowCount} unit="行" />
          <InlineMetric label="命中字段" value={hitFieldCount} unit="个" />
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-black text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {previewRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column} className="max-w-[260px] truncate px-4 py-3 text-slate-700">
                    <HighlightedCell
                      value={row.data[column]}
                      query={query}
                      mode={mode}
                      caseSensitive={caseSensitive}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function HighlightedCell({
  value,
  query,
  mode,
  caseSensitive,
}: {
  value: string;
  query: string;
  mode: SearchMode;
  caseSensitive: boolean;
}) {
  const keyword = query.trim();
  if (!keyword || !cellMatchesSearch(value, keyword, mode, caseSensitive)) return value;

  if (mode === "exact") {
    return <span className="rounded bg-amber-200 px-0.5 font-black text-slate-950">{value}</span>;
  }

  const haystack = caseSensitive ? value : value.toLowerCase();
  const needle = caseSensitive ? keyword : keyword.toLowerCase();
  const start = haystack.indexOf(needle);

  if (start < 0) {
    return <span className="rounded bg-amber-200 px-0.5 font-black text-slate-950">{value}</span>;
  }

  const end = start + keyword.length;
  return (
    <>
      {value.slice(0, start)}
      <span className="rounded bg-amber-200 px-0.5 font-black text-slate-950">
        {value.slice(start, end)}
      </span>
      {value.slice(end)}
    </>
  );
}

function InlineMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
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
