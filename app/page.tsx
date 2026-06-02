"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, X } from "lucide-react";
import type { MatchMode, TableSlot, ToolMode, WorkbookState } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { AppHeader } from "@/app/components/AppHeader";
import { ModeButton } from "@/app/components/ModeButton";
import { CollisionModule } from "@/app/modules/collision/CollisionModule";
import { LatestModule } from "@/app/modules/latest/LatestModule";
import { buildCollisionResult, stripCollisionExportPrefix } from "@/app/lib/collision";
import { buildLatestResult } from "@/app/lib/latest";
import { downloadExcel, getColumns, parseWorkbook } from "@/app/lib/workbook";

export default function Home() {
  const [toolMode, setToolMode] = useState<ToolMode>("collision");
  const [matchMode, setMatchMode] = useState<MatchMode>("complete");
  const [leftBook, setLeftBook] = useState<WorkbookState | null>(null);
  const [rightBook, setRightBook] = useState<WorkbookState | null>(null);
  const [latestBook, setLatestBook] = useState<WorkbookState | null>(null);
  const [leftField, setLeftField] = useState("");
  const [rightField, setRightField] = useState("");
  const [latestBaseField, setLatestBaseField] = useState("");
  const [latestTimeField, setLatestTimeField] = useState("");
  const [loadingSlot, setLoadingSlot] = useState<TableSlot | null>(null);
  const [error, setError] = useState("");

  const leftRows = leftBook?.sheets[leftBook.activeSheet] ?? [];
  const rightRows = rightBook?.sheets[rightBook.activeSheet] ?? [];
  const latestRows = latestBook?.sheets[latestBook.activeSheet] ?? [];
  const leftColumns = useMemo(() => getColumns(leftRows), [leftRows]);
  const rightColumns = useMemo(() => getColumns(rightRows), [rightRows]);
  const latestColumns = useMemo(() => getColumns(latestRows), [latestRows]);

  const collisionResult = useMemo(
    () =>
      buildCollisionResult({
        matchMode,
        leftRows,
        rightRows,
        leftColumns,
        rightColumns,
        leftField,
        rightField
      }),
    [matchMode, leftColumns, leftField, leftRows, rightColumns, rightField, rightRows]
  );

  const latestResult = useMemo(
    () =>
      buildLatestResult({
        rows: latestRows,
        columns: latestColumns,
        baseField: latestBaseField,
        timeField: latestTimeField
      }),
    [latestBaseField, latestColumns, latestRows, latestTimeField]
  );

  const activeTool = TOOL_DEFINITIONS[toolMode];
  const activeRows = toolMode === "collision" ? collisionResult.rows : latestResult.rows;
  const activeColumns = toolMode === "collision" ? collisionResult.columns : latestResult.columns;

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file) return;

    setError("");
    setLoadingSlot(slot);

    try {
      const workbook = await parseWorkbook(file);

      if (slot === "left") {
        setLeftBook(workbook);
        setLeftField("");
      } else if (slot === "right") {
        setRightBook(workbook);
        setRightField("");
      } else {
        setLatestBook(workbook);
        setLatestBaseField("");
        setLatestTimeField("");
      }
    } catch {
      setError("文件解析失败，请上传 .xlsx / .xls / .csv 文件。");
    } finally {
      setLoadingSlot(null);
    }
  }

  function updateSheet(slot: TableSlot, sheet: string) {
    if (slot === "left" && leftBook) {
      setLeftBook({ ...leftBook, activeSheet: sheet });
      setLeftField("");
    }

    if (slot === "right" && rightBook) {
      setRightBook({ ...rightBook, activeSheet: sheet });
      setRightField("");
    }

    if (slot === "latest" && latestBook) {
      setLatestBook({ ...latestBook, activeSheet: sheet });
      setLatestBaseField("");
      setLatestTimeField("");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7f1_0,#f6f8fb_32%,#eef2f7_100%)] text-ink">
      <AppHeader activeTool={toolMode} onToolChange={setToolMode} />

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-panel backdrop-blur">
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(260px,1fr)_minmax(280px,420px)_auto] md:items-center md:p-6">
            <div>
              <h1 className="text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">{activeTool.heading}</h1>
            </div>

            {toolMode === "collision" ? (
              <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <ModeButton active={matchMode === "complete"} onClick={() => setMatchMode("complete")} title="补全模式" />
                <ModeButton active={matchMode === "collision"} onClick={() => setMatchMode("collision")} title="碰撞模式" />
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-500">按基准字段取最新一条</div>
            )}

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              type="button"
              disabled={activeRows.length === 0}
              onClick={() =>
                downloadExcel(
                  activeTool.exportFile,
                  activeTool.exportSheet,
                  activeColumns,
                  activeRows,
                  toolMode === "collision" ? stripCollisionExportPrefix : undefined
                )
              }
              title="导出结果"
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

        {toolMode === "collision" ? (
          <CollisionModule
            leftBook={leftBook}
            rightBook={rightBook}
            leftColumns={leftColumns}
            rightColumns={rightColumns}
            leftRowsCount={leftRows.length}
            rightRowsCount={rightRows.length}
            leftField={leftField}
            rightField={rightField}
            loadingSlot={loadingSlot}
            result={collisionResult}
            matchMode={matchMode}
            onFile={handleFile}
            onSheet={updateSheet}
            onLeftField={setLeftField}
            onRightField={setRightField}
          />
        ) : (
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
          />
        )}
      </div>
    </main>
  );
}
