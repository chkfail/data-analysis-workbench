import { Plus, X } from "lucide-react";
import type { CollisionTableRuntime, JoinedRow, MatchMode, MetricTuple, TableSlot } from "@/app/types";
import { FieldSelect } from "@/app/components/FieldSelect";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";
import { StatusBadge } from "@/app/components/StatusBadge";
import { TableCard } from "@/app/components/TableCard";

export function CollisionModule({
  tables,
  loadingSlot,
  result,
  matchMode,
  onFile,
  onSheet,
  onField,
  onAddTable,
  onRemoveTable,
  onExport
}: {
  tables: CollisionTableRuntime[];
  loadingSlot: TableSlot | null;
  result: { rows: JoinedRow[]; columns: string[]; matched: number; leftOnly: number };
  matchMode: MatchMode;
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onField: (slot: TableSlot, field: string) => void;
  onAddTable: () => void;
  onRemoveTable: (slot: TableSlot) => void;
  onExport: () => void;
}) {
  const canJoin = tables.length >= 2 && tables.every((table) => table.workbook && table.field);
  const tableMetrics: MetricTuple[] = [["参与表", tables.length, "张"], ...tables.map((table) => [table.title, table.rows.length, "行"] as MetricTuple)];
  const resultMetrics: MetricTuple[] = [
    ["命中", result.matched, "行"],
    ["未命中", result.leftOnly, "行"]
  ];

  return (
    <>
      <section className="flex gap-4 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
        {tables.map((table, index) => (
          <div key={table.id} className="w-[min(82vw,560px)] shrink-0 lg:w-[calc(42.857%_-_0.857rem)] lg:min-w-[480px]">
            <TableCard
              slot={table.id}
              title={table.title}
              workbook={table.workbook}
              columns={table.columns}
              loading={loadingSlot === table.id}
              controlGridClass="sm:grid-cols-2"
              onFile={onFile}
              onSheet={onSheet}
              headerAction={
                index >= 2 ? (
                  <button
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    type="button"
                    onClick={() => onRemoveTable(table.id)}
                    title="移除此表"
                    aria-label="移除此表"
                  >
                    <X size={15} />
                  </button>
                ) : null
              }
              controls={
                <FieldSelect
                  label="碰撞字段"
                  disabled={table.columns.length === 0}
                  value={table.field}
                  onChange={(field) => onField(table.id, field)}
                  placeholder="选择字段"
                  options={table.columns}
                />
              }
            />
          </div>
        ))}

        <button
          className="grid min-h-[260px] w-[min(42vw,190px)] shrink-0 place-items-center rounded-[28px] border border-dashed border-slate-300 bg-slate-100/70 text-slate-500 transition hover:border-field hover:bg-teal-50 hover:text-field lg:w-[calc(14.286%_-_0.286rem)] lg:min-w-[150px]"
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

      <ResultPanel
        canShow={canJoin}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={canJoin ? "当前字段没有结果" : "至少导入两张表，并为每张表选择碰撞字段"}
        metrics={[...tableMetrics, ...resultMetrics]}
        metricRows={[tableMetrics, resultMetrics]}
        note="已按整行去重"
        onExport={onExport}
        renderCell={(row, column) => (column === "状态" ? <StatusBadge status={(row as JoinedRow).status} /> : row.data[column])}
      />
    </>
  );
}
