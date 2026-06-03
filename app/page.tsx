"use client";

import { useMemo, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import type {
  CollisionTableState,
  MatchMode,
  TableSlot,
  ToolMode,
  WorkbookState,
} from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { AppHeader } from "@/app/components/AppHeader";
import { ModeButton } from "@/app/components/ModeButton";
import { CollisionModule } from "@/app/modules/collision/CollisionModule";
import { DedupModule } from "@/app/modules/dedup/DedupModule";
import { ExtractModule } from "@/app/modules/extract/ExtractModule";
import { LatestModule } from "@/app/modules/latest/LatestModule";
import {
  buildCollisionResult,
  stripCollisionExportPrefix,
} from "@/app/lib/collision";
import {
  buildDedupResult,
  type BlockSize,
  type DedupMode,
} from "@/app/lib/dedup";
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
  const [dedupAlgorithm, setDedupAlgorithm] =
    useState<DedupMode>("levenshtein");
  const [dedupThreshold, setDedupThreshold] = useState(0.75);
  const [dedupBlockSize, setDedupBlockSize] = useState<BlockSize>("first-char");
  const [loadingSlot, setLoadingSlot] = useState<TableSlot | null>(null);
  const [error, setError] = useState("");

  const latestRows = latestBook?.sheets[latestBook.activeSheet] ?? [];
  const latestColumns = useMemo(() => getColumns(latestRows), [latestRows]);
  const extractRows = extractBook?.sheets[extractBook.activeSheet] ?? [];
  const extractColumns = useMemo(() => getColumns(extractRows), [extractRows]);
  const dedupRows = dedupBook?.sheets[dedupBook.activeSheet] ?? [];
  const dedupColumns = useMemo(() => getColumns(dedupRows), [dedupRows]);
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
      }),
    [matchMode, collisionRuntimeTables],
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
        algorithm: dedupAlgorithm,
        threshold: dedupThreshold,
        blockSize: dedupBlockSize,
      }),
    [
      dedupRows,
      dedupColumns,
      dedupFields,
      dedupAlgorithm,
      dedupThreshold,
      dedupBlockSize,
    ],
  );

  const activeTool = TOOL_DEFINITIONS[toolMode];
  const activeRows =
    toolMode === "collision"
      ? collisionResult.rows
      : toolMode === "latest"
        ? latestResult.rows
        : toolMode === "dedup"
          ? dedupResult.rows
          : extractResult.rows;
  const activeColumns =
    toolMode === "collision"
      ? collisionResult.columns
      : toolMode === "latest"
        ? latestResult.columns
        : toolMode === "dedup"
          ? dedupResult.columns
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
      } else {
        setCollisionTables((tables) =>
          tables.map((table) =>
            table.id === slot ? { ...table, workbook, field: "" } : table,
          ),
        );
      }
    } catch {
      setError("文件解析失败，请上传 .xlsx / .xls / .csv 文件。");
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

  function handleExport() {
    downloadExcel(
      activeTool.exportFile,
      activeTool.exportSheet,
      activeColumns,
      activeRows,
      toolMode === "collision" ? stripCollisionExportPrefix : undefined,
    );
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7f1_0,#f6f8fb_32%,#eef2f7_100%)] text-ink">
      <AppHeader activeTool={toolMode} onToolChange={setToolMode} />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-panel backdrop-blur">
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(260px,1fr)_minmax(280px,520px)] md:items-center md:p-6">
            <div>
              <h1 className="text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">
                {activeTool.heading}
              </h1>
            </div>

            {toolMode === "collision" ? (
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
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
            ) : toolMode === "extract" ? (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-500">
                按正则表达式提取字段
              </div>
            ) : toolMode === "dedup" ? (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-500">
                按相似度算法发现重复行
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-500">
                按基准字段取最新一条
              </div>
            )}
          </div>
        </section>

        {error ? (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              className="grid h-8 w-8 place-items-center rounded-xl hover:bg-amber-100"
              type="button"
              onClick={() => setError("")}
              title="关闭提示"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

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
            algorithm={dedupAlgorithm}
            threshold={dedupThreshold}
            blockSize={dedupBlockSize}
            loadingSlot={loadingSlot}
            result={dedupResult}
            onFile={handleFile}
            onSheet={updateSheet}
            onField={toggleDedupField}
            onAlgorithm={setDedupAlgorithm}
            onThreshold={setDedupThreshold}
            onBlockSize={setDedupBlockSize}
            onExport={handleExport}
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
    </main>
  );
}
