import { Plus, X } from "lucide-react";
import type { CollisionTableRuntime, JoinedRow, MatchMode, TableSlot } from "@/app/types";
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
  onRemoveTable
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
}) {
  const canJoin = tables.length >= 2 && tables.every((table) => table.workbook && table.field);
  const baseCount = tables[0]?.rows.length ?? 0;

  return (
    <>
      <section className="flex gap-4 overflow-x-auto pb-2 [scrollbar-gutter:stable]">
        {tables.map((table, index) => (
          <div key={table.id} className="relative w-[560px] max-w-[calc(100vw-2rem)] shrink-0">
            {index >= 2 ? (
              <button
                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                type="button"
                onClick={() => onRemoveTable(table.id)}
                title="移除此表"
              >
                <X size={15} />
              </button>
            ) : null}
            <TableCard
              slot={table.id}
              title={table.title}
              workbook={table.workbook}
              columns={table.columns}
              loading={loadingSlot === table.id}
              controlGridClass="sm:grid-cols-2"
              onFile={onFile}
              onSheet={onSheet}
              controls={
                <FieldSelect
                  label="研判字段"
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
          className="grid min-h-[260px] w-[560px] max-w-[calc(100vw-2rem)] shrink-0 place-items-center rounded-[28px] border border-dashed border-slate-300 bg-white/60 text-slate-500 transition hover:border-field hover:bg-teal-50 hover:text-field"
          type="button"
          onClick={onAddTable}
        >
          <span className="inline-flex items-center gap-2 text-sm font-black">
            <Plus size={20} />
            添加表
          </span>
        </button>
      </section>

      <ResultPanel
        canShow={canJoin}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={canJoin ? "当前字段没有结果" : "至少导入两张表，并为每张表选择研判字段"}
        metrics={[
          ["基准表", baseCount],
          ["参与表", tables.length],
          ["命中", result.matched],
          ["未命中", matchMode === "complete" ? result.leftOnly : 0]
        ]}
        renderCell={(row, column) => (column === "状态" ? <StatusBadge status={(row as JoinedRow).status} /> : row.data[column])}
      />
    </>
  );
}
