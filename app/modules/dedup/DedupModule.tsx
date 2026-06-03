import type {
  MetricTuple,
  OutputRow,
  TableSlot,
  WorkbookState,
} from "@/app/types";
import type { BlockSize, DedupMode } from "@/app/lib/dedup";
import { downloadExcel } from "@/app/lib/workbook";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";
import { TableCard } from "@/app/components/TableCard";

export function DedupModule({
  workbook,
  columns,
  sourceRowsCount,
  fields,
  algorithm,
  threshold,
  blockSize,
  loadingSlot,
  result,
  onFile,
  onSheet,
  onField,
  onAlgorithm,
  onThreshold,
  onBlockSize,
  onExport,
}: {
  workbook: WorkbookState | null;
  columns: string[];
  sourceRowsCount: number;
  fields: string[];
  algorithm: DedupMode;
  threshold: number;
  blockSize: BlockSize;
  loadingSlot: TableSlot | null;
  result: {
    rows: OutputRow[];
    columns: string[];
    clusterCount: number;
    involvedCount: number;
    recommendedCount: number;
    sourceCount: number;
  };
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onField: (field: string) => void;
  onAlgorithm: (algorithm: DedupMode) => void;
  onThreshold: (threshold: number) => void;
  onBlockSize: (blockSize: BlockSize) => void;
  onExport: () => void;
}) {
  const canDedup = Boolean(
    workbook && fields.length > 0 && result.columns.length > 0,
  );
  const thresholdPercent = Math.round(threshold * 100);

  // 推荐导出：去重后的行 + 独立行，去掉标记列
  const exportColumns =
    columns.length > 0
      ? columns
      : result.columns.filter((c) => c !== "重复组" && c !== "推荐保留");
  const recommendedRows = result.rows.filter(
    (row) => row.data["推荐保留"] === "★ 推荐保留" || !row.data["重复组"],
  );

  function handleExportRecommended() {
    downloadExcel(
      "模糊去重结果_推荐.xlsx",
      "去重结果",
      exportColumns,
      recommendedRows,
    );
  }

  function handleExportFull() {
    downloadExcel(
      "模糊去重结果_全量.xlsx",
      "去重结果",
      result.columns,
      result.rows,
    );
  }

  const metrics: MetricTuple[] = [
    ["原始行数", sourceRowsCount, "行"],
    ["匹配字段", fields.length, "个"],
    ["找到重复组", result.clusterCount, "组"],
    ["涉重行数", result.involvedCount, "行"],
  ];

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(420px,1fr)_minmax(340px,0.8fr)]">
        <TableCard
          slot="dedup"
          title="数据表"
          workbook={workbook}
          columns={columns}
          loading={loadingSlot === "dedup"}
          controlGridClass="sm:grid-cols-2"
          hideColumnPreview
          sheetAsChips
          onFile={onFile}
          onSheet={onSheet}
          controls={
            workbook ? (
              <div className="grid gap-2 text-xs font-black text-slate-500">
                匹配字段
                <div className="max-h-28 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
                  <div className="flex flex-wrap gap-2">
                    {columns.map((column) => (
                      <button
                        key={column}
                        className={[
                          "max-w-48 truncate rounded-full px-3 py-1.5 text-xs font-black transition",
                          fields.includes(column)
                            ? "bg-field text-white shadow-lg shadow-teal-900/15"
                            : "bg-white text-slate-500 hover:bg-teal-50 hover:text-field",
                        ].join(" ")}
                        type="button"
                        onClick={() => onField(column)}
                        title={column}
                      >
                        {column}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : undefined
          }
        />

        <article className="rounded-[28px] border border-white/70 bg-white p-5 shadow-panel">
          <div className="grid content-start gap-5">
            <div>
              <p className="text-xs font-black text-field">相似度算法</p>
              <div className="mt-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <AlgorithmButton
                  active={algorithm === "levenshtein"}
                  onClick={() => onAlgorithm("levenshtein")}
                  title="编辑距离"
                  desc="错别字敏感"
                />
                <AlgorithmButton
                  active={algorithm === "bigram"}
                  onClick={() => onAlgorithm("bigram")}
                  title="二元组"
                  desc="长文本更佳"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-field">分块粒度</p>
              <div className="mt-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <BlockButton
                  active={blockSize === "first-char"}
                  onClick={() => onBlockSize("first-char")}
                  title="首字分块"
                  desc="召回更多"
                />
                <BlockButton
                  active={blockSize === "first-2-chars"}
                  onClick={() => onBlockSize("first-2-chars")}
                  title="首2字分块"
                  desc="更精确"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-field">相似度阈值</p>
                <span className="text-sm font-black text-slate-950 tabular-nums">
                  {thresholdPercent}%
                </span>
              </div>
              <div className="mt-3">
                <input
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-field [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-field [&::-webkit-slider-thumb]:shadow-md"
                  type="range"
                  min={50}
                  max={95}
                  step={1}
                  value={thresholdPercent}
                  onChange={(event) =>
                    onThreshold(Number(event.target.value) / 100)
                  }
                />
                <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                  <span>宽松</span>
                  <span>严格</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <ResultPanel
        canShow={canDedup}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={canDedup ? "当前字段没有发现重复" : "导入表格，选择匹配字段"}
        metrics={metrics}
        note={
          result.clusterCount > 0
            ? `去重后可保留 ${result.recommendedCount} 组 + ${result.sourceCount - result.involvedCount} 条独立行`
            : undefined
        }
        onExport={handleExportRecommended}
        exportLabel="导出推荐"
        secondaryExport={{
          label: "导出全量(含标记)",
          onClick: handleExportFull,
        }}
        getRowClassName={(row) => {
          const status = row.data["推荐保留"];
          const group = row.data["重复组"];
          if (status.startsWith("★")) return "bg-emerald-50";
          if (group) return "bg-rose-50";
          return "";
        }}
        renderCell={(row, column) => {
          if (column === "重复组") {
            const value = row.data[column];
            if (!value) return <span className="text-slate-300">—</span>;
            return (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                {value}
              </span>
            );
          }
          if (column === "推荐保留") {
            const value = row.data[column];
            if (!value) return <span className="text-slate-300">—</span>;
            const isStar = value.startsWith("★");
            return (
              <span
                className={
                  isStar
                    ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800"
                    : "text-[11px] font-bold text-slate-400"
                }
              >
                {value}
              </span>
            );
          }
          return row.data[column];
        }}
      />
    </>
  );
}

function AlgorithmButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      className={[
        "rounded-xl px-3 py-2 text-left transition",
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      <span className="text-sm font-black">{title}</span>
      <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
        {desc}
      </span>
    </button>
  );
}

function BlockButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      className={[
        "rounded-xl px-3 py-2 text-left transition",
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      <span className="text-sm font-black">{title}</span>
      <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
        {desc}
      </span>
    </button>
  );
}
