"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import type { TableSlot, ToolMode } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { AppHeader } from "@/app/components/AppHeader";
import { ModeButton } from "@/app/components/ModeButton";
import { CollisionModule } from "@/app/modules/collision/CollisionModule";
import { useCollisionWorkbench } from "@/app/modules/collision/useCollisionWorkbench";
import { DedupModule } from "@/app/modules/dedup/DedupModule";
import { useDedupWorkbench } from "@/app/modules/dedup/useDedupWorkbench";
import { DiffModule } from "@/app/modules/diff/DiffModule";
import { useDiffWorkbench } from "@/app/modules/diff/useDiffWorkbench";
import { ExtractModule } from "@/app/modules/extract/ExtractModule";
import { useExtractWorkbench } from "@/app/modules/extract/useExtractWorkbench";
import { LatestModule } from "@/app/modules/latest/LatestModule";
import { useLatestWorkbench } from "@/app/modules/latest/useLatestWorkbench";
import { MergeModule } from "@/app/modules/merge/MergeModule";
import { useMergeWorkbench } from "@/app/modules/merge/useMergeWorkbench";
import { SearchModule } from "@/app/modules/search/SearchModule";
import { useSearchWorkbench } from "@/app/modules/search/useSearchWorkbench";

export default function Home() {
  const [toolMode, setToolMode] = useState<ToolMode>("collision");
  const [loadingSlot, setLoadingSlot] = useState<TableSlot | null>(null);
  const [error, setError] = useState("");
  const context = { setError, setLoadingSlot };

  const collision = useCollisionWorkbench(context);
  const merge = useMergeWorkbench(context);
  const extract = useExtractWorkbench(context);
  const dedup = useDedupWorkbench(context);
  const diff = useDiffWorkbench(context);
  const search = useSearchWorkbench(context);
  const latest = useLatestWorkbench(context);
  const activeTool = TOOL_DEFINITIONS[toolMode];

  function withExportError(run: () => Promise<void>) {
    return () => {
      run().catch(() => setError("导出失败，请重试。"));
    };
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
                    active={collision.matchMode === "complete"}
                    onClick={() => collision.setMatchMode("complete")}
                    title="补全基准表"
                  />
                  <ModeButton
                    active={collision.matchMode === "collision"}
                    onClick={() => collision.setMatchMode("collision")}
                    title="只取交集"
                  />
                </div>
                <CaseSensitiveToggle
                  checked={collision.caseSensitive}
                  onChange={collision.setCaseSensitive}
                />
              </div>
            ) : toolMode === "extract" ? (
              <ToolHint text="按正则表达式提取字段" />
            ) : toolMode === "search" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <ToolHint text="指定要素，全字段跨表检索" />
                <CaseSensitiveToggle
                  checked={search.caseSensitive}
                  onChange={search.setCaseSensitive}
                />
              </div>
            ) : toolMode === "dedup" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <ToolHint text="按相似度算法发现重复行" />
                <CaseSensitiveToggle
                  checked={dedup.caseSensitive}
                  onChange={dedup.setCaseSensitive}
                />
              </div>
            ) : toolMode === "diff" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-center">
                <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70">
                  <ModeButton
                    active={diff.mode === "unkeyed"}
                    onClick={() => diff.setMode("unkeyed")}
                    title="按内容比对"
                  />
                  <ModeButton
                    active={diff.mode === "keyed"}
                    onClick={() => diff.setMode("keyed")}
                    title="按字段对齐"
                  />
                </div>
                <CaseSensitiveToggle
                  checked={diff.caseSensitive}
                  onChange={diff.setCaseSensitive}
                />
              </div>
            ) : toolMode === "merge" ? (
              <ToolHint text="按基准表表头合并多张参与表" />
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
            tables={collision.tables}
            loadingSlot={loadingSlot}
            result={collision.result}
            computation={collision.computation}
            matchMode={collision.matchMode}
            onFile={collision.handleFile}
            onSheet={collision.updateSheet}
            onHeaderRow={collision.updateHeaderRow}
            onField={collision.updateField}
            onAddTable={collision.addTable}
            onRemoveTable={collision.removeTable}
            onExport={withExportError(collision.exportResult)}
          />
        ) : toolMode === "latest" ? (
          <LatestModule
            workbook={latest.book}
            columns={latest.columns}
            sourceRowsCount={latest.rows.length}
            baseField={latest.baseField}
            timeField={latest.timeField}
            loadingSlot={loadingSlot}
            result={latest.result}
            computation={latest.computation}
            onFile={latest.loadFile}
            onSheet={(_, sheet) => latest.selectSheet(sheet)}
            onHeaderRow={(_, headerRow) => latest.setHeaderRow(headerRow)}
            onBaseField={latest.setBaseField}
            onTimeField={latest.setTimeField}
            onExport={withExportError(latest.exportResult)}
          />
        ) : toolMode === "dedup" ? (
          <DedupModule
            workbook={dedup.book}
            columns={dedup.columns}
            sourceRowsCount={dedup.rows.length}
            fields={dedup.fields}
            exactFields={dedup.exactFields}
            algorithm={dedup.algorithm}
            threshold={dedup.threshold}
            blockSize={dedup.blockSize}
            loadingSlot={loadingSlot}
            result={dedup.result}
            computation={dedup.computation}
            onFile={dedup.loadFile}
            onSheet={(_, sheet) => dedup.selectSheet(sheet)}
            onHeaderRow={(_, headerRow) => dedup.setHeaderRow(headerRow)}
            onField={dedup.toggleField}
            onExactField={dedup.toggleExactField}
            onAlgorithm={dedup.setAlgorithm}
            onThreshold={dedup.setThreshold}
            onBlockSize={dedup.setBlockSize}
            onExportRecommended={withExportError(dedup.exportRecommended)}
            onExportFull={withExportError(dedup.exportFull)}
          />
        ) : toolMode === "diff" ? (
          <DiffModule
            oldBook={diff.oldSlot.book}
            newBook={diff.newSlot.book}
            oldColumns={diff.oldSlot.columns}
            newColumns={diff.newSlot.columns}
            mode={diff.mode}
            mapping={diff.mapping}
            loadingSlot={loadingSlot}
            result={diff.result}
            computation={diff.computation}
            caseSensitive={diff.caseSensitive}
            onFile={diff.handleFile}
            onSheet={diff.updateSheet}
            onHeaderRow={diff.updateHeaderRow}
            onMappingChange={diff.setMapping}
            onExport={withExportError(diff.exportResult)}
          />
        ) : toolMode === "search" ? (
          <SearchModule
            tables={search.tables}
            query={search.query}
            mode={search.mode}
            loadingSlot={loadingSlot}
            result={search.result}
            computation={search.computation}
            caseSensitive={search.caseSensitive}
            onQuery={search.setQuery}
            onMode={search.setMode}
            onFile={search.handleFile}
            onSheet={search.toggleSheet}
            onHeaderRow={search.updateHeaderRow}
            onAddTable={search.addTable}
            onRemoveTable={search.removeTable}
            onExport={withExportError(search.exportResult)}
          />
        ) : toolMode === "merge" ? (
          <MergeModule
            baseBook={merge.baseBook}
            tables={merge.tables}
            baseColumns={merge.baseColumns}
            fieldMapping={merge.fieldMapping}
            deduplicate={merge.deduplicate}
            loadingSlot={loadingSlot}
            result={merge.result}
            computation={merge.computation}
            isAddingFiles={merge.isAddingFiles}
            onFile={merge.handleFile}
            onBaseSheet={(sheet) => merge.updateSheet("merge-base", sheet)}
            onHeaderRow={merge.updateHeaderRow}
            onAddTable={merge.addTable}
            onAddFiles={merge.addFiles}
            onRemoveTable={merge.removeTable}
            onFieldMapping={merge.updateFieldMapping}
            onRemoveFieldMapping={merge.removeFieldMapping}
            onDeduplicate={merge.setDeduplicate}
            onExport={withExportError(merge.exportResult)}
          />
        ) : (
          <ExtractModule
            workbook={extract.book}
            columns={extract.columns}
            sourceRowsCount={extract.rows.length}
            sourceFields={extract.sourceFields}
            templates={extract.templates}
            customPattern={extract.customPattern}
            loadingSlot={loadingSlot}
            result={extract.result}
            computation={extract.computation}
            onFile={extract.loadFile}
            onSheet={(_, sheet) => extract.selectSheet(sheet)}
            onHeaderRow={(_, headerRow) => extract.setHeaderRow(headerRow)}
            onSourceField={extract.toggleSourceField}
            onTemplate={extract.toggleTemplate}
            onCustomPattern={extract.setCustomPattern}
            onExport={withExportError(extract.exportResult)}
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
