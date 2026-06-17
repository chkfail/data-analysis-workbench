"use client";

import { useMemo, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import type {
  CollisionTableState,
  MatchMode,
  TableSlot,
  DiffMode,
  ToolMode,
  WorkbookState,
} from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { AppHeader } from "@/app/components/AppHeader";
import { ModeButton } from "@/app/components/ModeButton";
import { CollisionModule } from "@/app/modules/collision/CollisionModule";
import { DedupModule } from "@/app/modules/dedup/DedupModule";
import { DiffModule } from "@/app/modules/diff/DiffModule";
import { ExtractModule } from "@/app/modules/extract/ExtractModule";
import { LatestModule } from "@/app/modules/latest/LatestModule";
import { SearchModule } from "@/app/modules/search/SearchModule";
import { useSearchWorkbench } from "@/app/modules/search/useSearchWorkbench";
import {
  buildCollisionResult,
  stripCollisionExportPrefix,
} from "@/app/lib/collision";
import {
  buildDedupResult,
  type BlockSize,
  type DedupMode,
} from "@/app/lib/dedup";
import {
  buildKeyedDiffResult,
  buildUnkeyedDiffResult,
  type DiffMapping,
} from "@/app/lib/diff";
import { buildExtractResult, type ExtractTemplateId } from "@/app/lib/extract";
import { buildLatestResult } from "@/app/lib/latest";
import { downloadExcel, getColumns, parseWorkbook } from "@/app/lib/workbook";

const initialCollisionTables: CollisionTableState[] = [
  { id: "collision-1", title: "基准表", workbook: null, field: "" },
  { id: "collision-2", title: "参与表 A", workbook: null, field: "" },
];

function getCollisionTableTitle(index: number) {
  if (index === 0) return "基准表";
  return `参与表 ${String.fromCharCode(64 + index)}`;
}

export default function Home() {
  const [toolMode, setToolMode] = useState<ToolMode>("collision");
  const [matchMode, setMatchMode] = useState<MatchMode>("complete");
  const [collisionCaseSensitive, setCollisionCaseSensitive] = useState(false);
  const [collisionTables, setCollisionTables] = useState<CollisionTableState[]>(
    initialCollisionTables,
  );
  const [latestBook, setLatestBook] = useState<WorkbookState | null>(null);
  const [latestBaseField, setLatestBaseField] = useState("");
  const [latestTimeField, setLatestTimeField] = useState("");
  const [extractBook, setExtractBook] = useState<WorkbookState | null>(null);
  const [extractSourceFields, setExtractSourceFields] = useState<string[]>([]);
  const [extractTemplates, setExtractTemplates] = useState<ExtractTemplateId[]>(
    ["mobile"],
  );
  const [extractCustomPattern, setExtractCustomPattern] = useState("");
  const [dedupBook, setDedupBook] = useState<WorkbookState | null>(null);
  const [dedupFields, setDedupFields] = useState<string[]>([]);
  const [dedupExactFields, setDedupExactFields] = useState<string[]>([]);
  const [dedupAlgorithm, setDedupAlgorithm] =
    useState<DedupMode>("levenshtein");
  const [dedupThreshold, setDedupThreshold] = useState(0.75);
  const [dedupBlockSize, setDedupBlockSize] = useState<BlockSize>("first-char");
  const [dedupCaseSensitive, setDedupCaseSensitive] = useState(false);
  const [diffMode, setDiffMode] = useState<DiffMode>("unkeyed");
  const [diffOldBook, setDiffOldBook] = useState<WorkbookState | null>(null);
  const [diffNewBook, setDiffNewBook] = useState<WorkbookState | null>(null);
  const [diffMapping, setDiffMapping] = useState<DiffMapping>({
    oldFields: [],
    newFields: [],
  });
  const [diffCaseSensitive, setDiffCaseSensitive] = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<TableSlot | null>(null);
  const [error, setError] = useState("");
  const searchWorkbench = useSearchWorkbench({
    exportFile: TOOL_DEFINITIONS.search.exportFile,
    setError,
    setLoadingSlot,
  });

  const latestRows = latestBook?.sheets[latestBook.activeSheet] ?? [];
  const latestColumns = useMemo(() => getColumns(latestRows), [latestRows]);
  const extractRows = extractBook?.sheets[extractBook.activeSheet] ?? [];
  const extractColumns = useMemo(() => getColumns(extractRows), [extractRows]);
  const dedupRows = dedupBook?.sheets[dedupBook.activeSheet] ?? [];
  const dedupColumns = useMemo(() => getColumns(dedupRows), [dedupRows]);
  const diffOldRows = diffOldBook?.sheets[diffOldBook.activeSheet] ?? [];
  const diffNewRows = diffNewBook?.sheets[diffNewBook.activeSheet] ?? [];
  const diffOldColumns = useMemo(() => getColumns(diffOldRows), [diffOldRows]);
  const diffNewColumns = useMemo(() => getColumns(diffNewRows), [diffNewRows]);
  const collisionRuntimeTables = useMemo(
    () =>
      collisionTables.map((table) => {
        const rows = table.workbook?.sheets[table.workbook.activeSheet] ?? [];
        return {
          ...table,
          rows,
          columns: getColumns(rows),
        };
      }),
    [collisionTables],
  );

  const collisionResult = useMemo(
    () =>
      buildCollisionResult({
        matchMode,
        tables: collisionRuntimeTables,
        caseSensitive: collisionCaseSensitive,
      }),
    [matchMode, collisionRuntimeTables, collisionCaseSensitive],
  );

  const latestResult = useMemo(
    () =>
      buildLatestResult({
        rows: latestRows,
        columns: latestColumns,
        baseField: latestBaseField,
        timeField: latestTimeField,
      }),
    [latestBaseField, latestColumns, latestRows, latestTimeField],
  );
  const extractResult = useMemo(
    () =>
      buildExtractResult({
        rows: extractRows,
        columns: extractColumns,
        sourceFields: extractSourceFields,
        templates: extractTemplates,
        customPattern: extractCustomPattern,
      }),
    [
      extractColumns,
      extractCustomPattern,
      extractRows,
      extractSourceFields,
      extractTemplates,
    ],
  );
  const dedupResult = useMemo(
    () =>
      buildDedupResult({
        rows: dedupRows,
        columns: dedupColumns,
        fields: dedupFields,
        exactFields: dedupExactFields,
        algorithm: dedupAlgorithm,
        threshold: dedupThreshold,
        blockSize: dedupBlockSize,
        caseSensitive: dedupCaseSensitive,
      }),
    [
      dedupRows,
      dedupColumns,
      dedupFields,
      dedupExactFields,
      dedupAlgorithm,
      dedupThreshold,
      dedupBlockSize,
      dedupCaseSensitive,
    ],
  );
  const diffResult = useMemo(() => {
    if (diffMode === "keyed") {
      return buildKeyedDiffResult({
        oldRows: diffOldRows,
        oldColumns: diffOldColumns,
        newRows: diffNewRows,
        newColumns: diffNewColumns,
        mapping: diffMapping,
        caseSensitive: diffCaseSensitive,
      });
    }

    return buildUnkeyedDiffResult({
      oldRows: diffOldRows,
      oldColumns: diffOldColumns,
      newRows: diffNewRows,
      newColumns: diffNewColumns,
      caseSensitive: diffCaseSensitive,
    });
  }, [
    diffMode,
    diffOldRows,
    diffOldColumns,
    diffNewRows,
    diffNewColumns,
    diffMapping,
    diffCaseSensitive,
  ]);
  const activeTool = TOOL_DEFINITIONS[toolMode];
  const activeRows =
    toolMode === "collision"
      ? collisionResult.rows
      : toolMode === "latest"
        ? latestResult.rows
        : toolMode === "dedup"
          ? dedupResult.rows
          : toolMode === "diff"
            ? diffResult.rows
            : toolMode === "search"
              ? searchWorkbench.result.rows
              : extractResult.rows;
  const activeColumns =
    toolMode === "collision"
      ? collisionResult.columns
      : toolMode === "latest"
        ? latestResult.columns
        : toolMode === "dedup"
          ? dedupResult.columns
          : toolMode === "diff"
            ? diffResult.columns
            : toolMode === "search"
              ? searchWorkbench.result.columns
              : extractResult.columns;

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file) return;

    setError("");
    setLoadingSlot(slot);

    try {
      const workbook = await parseWorkbook(file);

      if (slot === "latest") {
        setLatestBook(workbook);
        setLatestBaseField("");
        setLatestTimeField("");
      } else if (slot === "extract") {
        setExtractBook(workbook);
        setExtractSourceFields([]);
      } else if (slot === "dedup") {
        setDedupBook(workbook);
        setDedupFields([]);
        setDedupExactFields([]);
      } else if (slot === "diff-old") {
        setDiffOldBook(workbook);
        setDiffMapping({ oldFields: [], newFields: [] });
      } else if (slot === "diff-new") {
        setDiffNewBook(workbook);
        setDiffMapping((mapping) => ({ ...mapping, newFields: [] }));
      } else {
        setCollisionTables((tables) =>
          tables.map((table) =>
            table.id === slot ? { ...table, workbook, field: "" } : table,
          ),
        );
      }
    } catch {
      setError("文件解析失败，请上传 .xlsx / .csv 文件。");
    } finally {
      setLoadingSlot(null);
    }
  }

  function updateSheet(slot: TableSlot, sheet: string) {
    if (slot === "latest" && latestBook) {
      setLatestBook({ ...latestBook, activeSheet: sheet });
      setLatestBaseField("");
      setLatestTimeField("");
      return;
    }

    if (slot === "extract" && extractBook) {
      setExtractBook({ ...extractBook, activeSheet: sheet });
      setExtractSourceFields([]);
      return;
    }

    if (slot === "dedup" && dedupBook) {
      setDedupBook({ ...dedupBook, activeSheet: sheet });
      setDedupFields([]);
      setDedupExactFields([]);
      return;
    }

    if (slot === "diff-old" && diffOldBook) {
      setDiffOldBook({ ...diffOldBook, activeSheet: sheet });
      setDiffMapping({ oldFields: [], newFields: [] });
      return;
    }

    if (slot === "diff-new" && diffNewBook) {
      setDiffNewBook({ ...diffNewBook, activeSheet: sheet });
      setDiffMapping((mapping) => ({ ...mapping, newFields: [] }));
      return;
    }

    setCollisionTables((tables) =>
      tables.map((table) =>
        table.id === slot && table.workbook
          ? {
              ...table,
              workbook: { ...table.workbook, activeSheet: sheet },
              field: "",
            }
          : table,
      ),
    );
  }

  function updateCollisionField(slot: TableSlot, field: string) {
    setCollisionTables((tables) =>
      tables.map((table) => (table.id === slot ? { ...table, field } : table)),
    );
  }

  function addCollisionTable() {
    setCollisionTables((tables) => {
      const nextIndex = tables.length + 1;
      return [
        ...tables,
        {
          id: `collision-${Date.now()}`,
          title: getCollisionTableTitle(nextIndex - 1),
          workbook: null,
          field: "",
        },
      ];
    });
  }

  function removeCollisionTable(slot: TableSlot) {
    setCollisionTables((tables) => {
      if (tables.length <= 2) return tables;
      return tables
        .filter((table) => table.id !== slot)
        .map((table, index) => ({
          ...table,
          title: getCollisionTableTitle(index),
        }));
    });
  }

  async function handleExport() {
    try {
      if (toolMode === "search") {
        await searchWorkbench.exportResult();
        return;
      }

      await downloadExcel(
        activeTool.exportFile,
        activeTool.exportSheet,
        activeColumns,
        activeRows,
        toolMode === "collision" ? stripCollisionExportPrefix : undefined,
      );
    } catch {
      setError("导出失败，请重试。");
    }
  }

  function toggleExtractTemplate(template: ExtractTemplateId) {
    setExtractTemplates((templates) =>
      templates.includes(template)
        ? templates.filter((item) => item !== template)
        : [...templates, template],
    );
  }

  function toggleExtractSourceField(field: string) {
    setExtractSourceFields((fields) =>
      fields.includes(field)
        ? fields.filter((item) => item !== field)
        : [...fields, field],
    );
  }

  function toggleDedupField(field: string) {
    setDedupFields((fields) =>
      fields.includes(field)
        ? fields.filter((item) => item !== field)
        : [...fields, field],
    );
  }

  function toggleDedupExactField(field: string) {
    setDedupExactFields((fields) =>
      fields.includes(field)
        ? fields.filter((item) => item !== field)
        : [...fields, field],
    );
  }

  return (
    <main className="min-h-screen text-ink">
      <AppHeader activeTool={toolMode} onToolChange={setToolMode} />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <section className="panel overflow-hidden bg-white/85 backdrop-blur">
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(260px,1fr)_minmax(280px,520px)] md:items-center md:p-6">
            <div className="flex items-center gap-3">
              <span
                className="h-7 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-field to-ink/70"
                aria-hidden
              />
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {activeTool.heading}
              </h1>
            </div>

            {toolMode === "collision" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70">
                  <ModeButton
                    active={matchMode === "complete"}
                    onClick={() => setMatchMode("complete")}
                    title="补全基准表"
                  />
                  <ModeButton
                    active={matchMode === "collision"}
                    onClick={() => setMatchMode("collision")}
                    title="只取交集"
                  />
                </div>
                <CaseSensitiveToggle
                  checked={collisionCaseSensitive}
                  onChange={setCollisionCaseSensitive}
                />
              </div>
            ) : toolMode === "extract" ? (
              <ToolHint text="按正则表达式提取字段" />
            ) : toolMode === "search" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <ToolHint text="指定要素，全字段跨表检索" />
                <CaseSensitiveToggle
                  checked={searchWorkbench.caseSensitive}
                  onChange={searchWorkbench.setCaseSensitive}
                />
              </div>
            ) : toolMode === "dedup" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <ToolHint text="按相似度算法发现重复行" />
                <CaseSensitiveToggle
                  checked={dedupCaseSensitive}
                  onChange={setDedupCaseSensitive}
                />
              </div>
            ) : toolMode === "diff" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70">
                  <ModeButton
                    active={diffMode === "unkeyed"}
                    onClick={() => setDiffMode("unkeyed")}
                    title="按内容比对"
                  />
                  <ModeButton
                    active={diffMode === "keyed"}
                    onClick={() => setDiffMode("keyed")}
                    title="按字段对齐"
                  />
                </div>
                <CaseSensitiveToggle
                  checked={diffCaseSensitive}
                  onChange={setDiffCaseSensitive}
                />
              </div>
            ) : (
              <ToolHint text="按基准字段取最新一条" />
            )}
          </div>
        </section>

        {error ? (
          <div className="animate-rise grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              className="grid h-8 w-8 place-items-center rounded-xl transition hover:bg-amber-100"
              type="button"
              onClick={() => setError("")}
              title="关闭提示"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        <div key={toolMode} className="animate-rise flex flex-col gap-4">
        {toolMode === "collision" ? (
          <CollisionModule
            tables={collisionRuntimeTables}
            loadingSlot={loadingSlot}
            result={collisionResult}
            matchMode={matchMode}
            onFile={handleFile}
            onSheet={updateSheet}
            onField={updateCollisionField}
            onAddTable={addCollisionTable}
            onRemoveTable={removeCollisionTable}
            onExport={handleExport}
          />
        ) : toolMode === "latest" ? (
          <LatestModule
            workbook={latestBook}
            columns={latestColumns}
            sourceRowsCount={latestRows.length}
            baseField={latestBaseField}
            timeField={latestTimeField}
            loadingSlot={loadingSlot}
            result={latestResult}
            onFile={handleFile}
            onSheet={updateSheet}
            onBaseField={setLatestBaseField}
            onTimeField={setLatestTimeField}
            onExport={handleExport}
          />
        ) : toolMode === "dedup" ? (
          <DedupModule
            workbook={dedupBook}
            columns={dedupColumns}
            sourceRowsCount={dedupRows.length}
            fields={dedupFields}
            exactFields={dedupExactFields}
            algorithm={dedupAlgorithm}
            threshold={dedupThreshold}
            blockSize={dedupBlockSize}
            loadingSlot={loadingSlot}
            result={dedupResult}
            onFile={handleFile}
            onSheet={updateSheet}
            onField={toggleDedupField}
            onExactField={toggleDedupExactField}
            onAlgorithm={setDedupAlgorithm}
            onThreshold={setDedupThreshold}
            onBlockSize={setDedupBlockSize}
            onExport={handleExport}
          />
        ) : toolMode === "diff" ? (
          <DiffModule
            oldBook={diffOldBook}
            newBook={diffNewBook}
            oldColumns={diffOldColumns}
            newColumns={diffNewColumns}
            mode={diffMode}
            mapping={diffMapping}
            loadingSlot={loadingSlot}
            result={diffResult}
            caseSensitive={diffCaseSensitive}
            onFile={handleFile}
            onSheet={updateSheet}
            onMappingChange={setDiffMapping}
            onExport={handleExport}
          />
        ) : toolMode === "search" ? (
          <SearchModule
            tables={searchWorkbench.tables}
            query={searchWorkbench.query}
            mode={searchWorkbench.mode}
            loadingSlot={loadingSlot}
            result={searchWorkbench.result}
            caseSensitive={searchWorkbench.caseSensitive}
            onQuery={searchWorkbench.setQuery}
            onMode={searchWorkbench.setMode}
            onFile={searchWorkbench.handleFile}
            onSheet={searchWorkbench.toggleSheet}
            onAddTable={searchWorkbench.addTable}
            onRemoveTable={searchWorkbench.removeTable}
            onExport={searchWorkbench.exportResult}
          />
        ) : (
          <ExtractModule
            workbook={extractBook}
            columns={extractColumns}
            sourceRowsCount={extractRows.length}
            sourceFields={extractSourceFields}
            templates={extractTemplates}
            customPattern={extractCustomPattern}
            loadingSlot={loadingSlot}
            result={extractResult}
            onFile={handleFile}
            onSheet={updateSheet}
            onSourceField={toggleExtractSourceField}
            onTemplate={toggleExtractTemplate}
            onCustomPattern={setExtractCustomPattern}
            onExport={handleExport}
          />
        )}
        </div>
      </div>
    </main>
  );
}

function ToolHint({ text }: { text: string }) {
  return (
    <div className="flex h-12 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-paper/70 px-4 text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function CaseSensitiveToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex h-11 cursor-pointer select-none items-center justify-center gap-2.5 rounded-2xl bg-slate-100 px-4 ring-1 ring-inset ring-slate-200/70 transition hover:bg-slate-200/70">
      <input
        className="peer sr-only"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-field peer-checked:after:translate-x-4"
        aria-hidden
      />
      <span className="text-sm font-bold text-slate-500 transition peer-checked:text-slate-800">
        区分大小写
      </span>
    </label>
  );
}
