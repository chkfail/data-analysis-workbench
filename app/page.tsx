"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  X
} from "lucide-react";

type MatchMode = "complete" | "collision";
type TableSide = "left" | "right";
type DataRow = Record<string, string | number | boolean | null>;

type WorkbookState = {
  name: string;
  sheets: Record<string, DataRow[]>;
  activeSheet: string;
};

type JoinedRow = {
  id: string;
  status: "matched" | "left-only";
  data: Record<string, string>;
};

const MAX_PREVIEW_ROWS = 250;

function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).trim();
}

function normalizeKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function parseWorkbook(file: File): Promise<WorkbookState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheets = workbook.SheetNames.reduce<Record<string, DataRow[]>>((acc, sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
            raw: false
          });

          acc[sheetName] = rows.map((row) =>
            Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), normalizeCell(value)]))
          );
          return acc;
        }, {});

        resolve({
          name: file.name,
          sheets,
          activeSheet: workbook.SheetNames[0] ?? ""
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function getColumns(rows: DataRow[]) {
  return Array.from(
    rows.reduce<Set<string>>((columns, row) => {
      Object.keys(row).forEach((key) => columns.add(key));
      return columns;
    }, new Set())
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function downloadExcel(filename: string, columns: string[], rows: JoinedRow[]) {
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((row) => row.data),
    {
      header: columns
    }
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "碰撞结果");
  XLSX.writeFile(workbook, filename);
}

export default function Home() {
  const [leftBook, setLeftBook] = useState<WorkbookState | null>(null);
  const [rightBook, setRightBook] = useState<WorkbookState | null>(null);
  const [leftField, setLeftField] = useState("");
  const [rightField, setRightField] = useState("");
  const [matchMode, setMatchMode] = useState<MatchMode>("complete");
  const [loadingSide, setLoadingSide] = useState<TableSide | null>(null);
  const [error, setError] = useState("");

  const leftRows = leftBook?.sheets[leftBook.activeSheet] ?? [];
  const rightRows = rightBook?.sheets[rightBook.activeSheet] ?? [];
  const leftColumns = useMemo(() => getColumns(leftRows), [leftRows]);
  const rightColumns = useMemo(() => getColumns(rightRows), [rightRows]);

  const result = useMemo(() => {
    if (!leftField || !rightField || leftRows.length === 0 || rightRows.length === 0) {
      return { rows: [] as JoinedRow[], columns: [] as string[], matched: 0, leftOnly: 0 };
    }

    const rightIndex = rightRows.reduce<Map<string, DataRow[]>>((index, row) => {
      const key = normalizeKey(row[rightField]);
      if (!key) return index;
      const bucket = index.get(key) ?? [];
      bucket.push(row);
      index.set(key, bucket);
      return index;
    }, new Map());

    const leftPrefixed = leftColumns.map((column) => `左表.${column}`);
    const rightPrefixed = rightColumns.map((column) => `右表.${column}`);
    const columns = ["状态", ...leftPrefixed, ...rightPrefixed];
    let matched = 0;
    let leftOnly = 0;

    const rows = leftRows.flatMap<JoinedRow>((leftRow, leftIndex) => {
      const key = normalizeKey(leftRow[leftField]);
      const matches = key ? rightIndex.get(key) ?? [] : [];

      if (matches.length === 0) {
        if (matchMode === "collision") return [];
        leftOnly += 1;
        return [
          {
              id: `${leftIndex}-empty`,
            status: "left-only",
            data: {
              状态: "未命中",
              ...Object.fromEntries(leftColumns.map((column) => [`左表.${column}`, formatValue(leftRow[column])])),
              ...Object.fromEntries(rightColumns.map((column) => [`右表.${column}`, ""]))
            }
          }
        ];
      }

      matched += matches.length;
      return matches.map((rightRow, matchIndex) => ({
        id: `${leftIndex}-${matchIndex}`,
        status: "matched" as const,
        data: {
          状态: "命中",
          ...Object.fromEntries(leftColumns.map((column) => [`左表.${column}`, formatValue(leftRow[column])])),
          ...Object.fromEntries(rightColumns.map((column) => [`右表.${column}`, formatValue(rightRow[column])]))
        }
      }));
    });

    return { rows, columns, matched, leftOnly };
  }, [matchMode, leftColumns, leftField, leftRows, rightColumns, rightField, rightRows]);

  const previewRows = result.rows.slice(0, MAX_PREVIEW_ROWS);
  const canJoin = Boolean(leftBook && rightBook && leftField && rightField);

  async function handleFile(side: TableSide, file?: File) {
    if (!file) return;

    setError("");
    setLoadingSide(side);

    try {
      const workbook = await parseWorkbook(file);
      if (side === "left") {
        setLeftBook(workbook);
        setLeftField("");
      } else {
        setRightBook(workbook);
        setRightField("");
      }
    } catch {
      setError("文件解析失败，请上传 .xlsx / .xls / .csv 文件。");
    } finally {
      setLoadingSide(null);
    }
  }

  function updateSheet(side: TableSide, sheet: string) {
    if (side === "left" && leftBook) {
      setLeftBook({ ...leftBook, activeSheet: sheet });
      setLeftField("");
    }

    if (side === "right" && rightBook) {
      setRightBook({ ...rightBook, activeSheet: sheet });
      setRightField("");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7f1_0,#f6f8fb_32%,#eef2f7_100%)] px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-panel backdrop-blur">
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(260px,1fr)_minmax(280px,420px)_auto] md:items-center md:p-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-field ring-1 ring-teal-100">
                <FileSpreadsheet size={14} />
                数据研判工具集
              </div>
              <h1 className="text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">表格碰撞研判台</h1>
            </div>

            <div className="grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1">
              <ModeButton active={matchMode === "complete"} onClick={() => setMatchMode("complete")} title="补全模式" />
              <ModeButton active={matchMode === "collision"} onClick={() => setMatchMode("collision")} title="碰撞模式" />
            </div>

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              type="button"
              disabled={result.rows.length === 0}
              onClick={() => downloadExcel("表格碰撞结果.xlsx", result.columns, result.rows)}
              title="导出碰撞结果"
            >
              <Download size={18} />
              导出 Excel
            </button>
          </div>
        </section>

        {error ? (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="grid h-8 w-8 place-items-center rounded-xl hover:bg-amber-100" type="button" onClick={() => setError("")} title="关闭提示">
              <X size={16} />
            </button>
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <DataPanel
            side="left"
            title="左表"
            workbook={leftBook}
            columns={leftColumns}
            selectedField={leftField}
            loading={loadingSide === "left"}
            onFile={handleFile}
            onField={setLeftField}
            onSheet={updateSheet}
          />

          <DataPanel
            side="right"
            title="右表"
            workbook={rightBook}
            columns={rightColumns}
            selectedField={rightField}
            loading={loadingSide === "right"}
            onFile={handleFile}
            onField={setRightField}
            onSheet={updateSheet}
          />
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-field">结果</p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <h2 className="text-xl font-black text-slate-950">{canJoin ? `${result.rows.length.toLocaleString("zh-CN")} 条` : "等待字段"}</h2>
                <div className="flex flex-wrap gap-2 pb-0.5">
                  <InlineMetric label="左表" value={leftRows.length} />
                  <InlineMetric label="右表" value={rightRows.length} />
                  <InlineMetric label="命中" value={result.matched} />
                  <InlineMetric label="未命中" value={matchMode === "complete" ? result.leftOnly : 0} />
                </div>
              </div>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-500">
              <Search size={15} />
              预览 {MAX_PREVIEW_ROWS} 行
            </div>
          </div>

          {canJoin && result.rows.length > 0 ? (
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column} className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-black text-slate-600">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row) => (
                    <tr key={row.id} className={row.status === "left-only" ? "bg-amber-50/50" : "hover:bg-teal-50/40"}>
                      {result.columns.map((column) => (
                        <td key={column} className="max-w-[260px] truncate px-4 py-3 text-slate-700">
                          {column === "状态" ? <StatusBadge status={row.status} /> : row.data[column]}
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
                <p className="text-sm font-bold text-slate-500">{canJoin ? "当前字段没有结果" : "导入左右表，选择字段"}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ModeButton({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      className={[
        "h-11 rounded-xl text-sm font-black transition",
        active ? "bg-field text-white shadow-md shadow-teal-900/15" : "text-slate-600 hover:bg-white/70"
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {title}
    </button>
  );
}

function DataPanel({
  side,
  title,
  workbook,
  columns,
  selectedField,
  loading,
  onFile,
  onField,
  onSheet
}: {
  side: TableSide;
  title: string;
  workbook: WorkbookState | null;
  columns: string[];
  selectedField: string;
  loading: boolean;
  onFile: (side: TableSide, file?: File) => void;
  onField: (field: string) => void;
  onSheet: (side: TableSide, sheet: string) => void;
}) {
  const rowCount = workbook ? workbook.sheets[workbook.activeSheet]?.length ?? 0 : 0;
  const columnPreview = columns.slice(0, 5);

  return (
    <article className="rounded-[28px] border border-white/70 bg-white shadow-panel">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-black text-field">{title}</p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-950">{workbook?.name ?? "未导入"}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{rowCount.toLocaleString("zh-CN")} 行</span>
          {workbook ? (
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-field px-3 text-xs font-black text-white transition hover:bg-teal-700">
              <Upload size={13} />
              更换
              <input className="sr-only" accept=".xlsx,.xls,.csv" type="file" onChange={(event) => onFile(side, event.target.files?.[0])} />
            </label>
          ) : null}
        </div>
      </div>

      {!workbook ? (
        <div className="px-5">
          <label className="group flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm font-black text-slate-500 transition hover:border-field hover:bg-teal-50 hover:text-field">
            {loading ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
            <span>{loading ? "解析中" : "导入 Excel / CSV"}</span>
            <input className="sr-only" accept=".xlsx,.xls,.csv" type="file" onChange={(event) => onFile(side, event.target.files?.[0])} />
          </label>
        </div>
      ) : null}

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <FieldSelect
          label="工作表"
          disabled={!workbook}
          value={workbook?.activeSheet ?? ""}
          onChange={(value) => onSheet(side, value)}
          placeholder="待导入"
          options={workbook ? Object.keys(workbook.sheets) : []}
        />
        <FieldSelect label="研判字段" disabled={columns.length === 0} value={selectedField} onChange={onField} placeholder="选择字段" options={columns} />
      </div>

      <div className="flex min-h-14 flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4">
        {columnPreview.length > 0 ? (
          <>
            {columnPreview.map((column) => (
              <span key={column} className="max-w-40 truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                {column}
              </span>
            ))}
            {columns.length > columnPreview.length ? <span className="text-xs font-bold text-slate-400">+{columns.length - columnPreview.length}</span> : null}
          </>
        ) : (
          <span className="text-xs font-bold text-slate-400">等待字段</span>
        )}
      </div>
    </article>
  );
}

function FieldSelect({
  label,
  disabled,
  value,
  onChange,
  placeholder,
  options
}: {
  label: string;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-xs font-black text-slate-500">
      {label}
      <select
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-field focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InlineMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
      {label}
      <strong className="text-slate-950">{value.toLocaleString("zh-CN")}</strong>
    </span>
  );
}

function StatusBadge({ status }: { status: JoinedRow["status"] }) {
  if (status === "matched") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-field">
        <CheckCircle2 size={13} />
        命中
      </span>
    );
  }

  return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">未命中</span>;
}
