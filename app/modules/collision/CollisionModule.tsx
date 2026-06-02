import type { JoinedRow, MatchMode, TableSlot, WorkbookState } from "@/app/types";
import { FieldSelect } from "@/app/components/FieldSelect";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";
import { StatusBadge } from "@/app/components/StatusBadge";
import { TableCard } from "@/app/components/TableCard";

export function CollisionModule({
  leftBook,
  rightBook,
  leftColumns,
  rightColumns,
  leftRowsCount,
  rightRowsCount,
  leftField,
  rightField,
  loadingSlot,
  result,
  matchMode,
  onFile,
  onSheet,
  onLeftField,
  onRightField
}: {
  leftBook: WorkbookState | null;
  rightBook: WorkbookState | null;
  leftColumns: string[];
  rightColumns: string[];
  leftRowsCount: number;
  rightRowsCount: number;
  leftField: string;
  rightField: string;
  loadingSlot: TableSlot | null;
  result: { rows: JoinedRow[]; columns: string[]; matched: number; leftOnly: number };
  matchMode: MatchMode;
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onLeftField: (field: string) => void;
  onRightField: (field: string) => void;
}) {
  const canJoin = Boolean(leftBook && rightBook && leftField && rightField);

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <TableCard
          slot="left"
          title="左表"
          workbook={leftBook}
          columns={leftColumns}
          loading={loadingSlot === "left"}
          controlGridClass="sm:grid-cols-2"
          onFile={onFile}
          onSheet={onSheet}
          controls={<FieldSelect label="研判字段" disabled={leftColumns.length === 0} value={leftField} onChange={onLeftField} placeholder="选择字段" options={leftColumns} />}
        />

        <TableCard
          slot="right"
          title="右表"
          workbook={rightBook}
          columns={rightColumns}
          loading={loadingSlot === "right"}
          controlGridClass="sm:grid-cols-2"
          onFile={onFile}
          onSheet={onSheet}
          controls={<FieldSelect label="研判字段" disabled={rightColumns.length === 0} value={rightField} onChange={onRightField} placeholder="选择字段" options={rightColumns} />}
        />
      </section>

      <ResultPanel
        canShow={canJoin}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={canJoin ? "当前字段没有结果" : "导入左右表，选择字段"}
        metrics={[
          ["左表", leftRowsCount],
          ["右表", rightRowsCount],
          ["命中", result.matched],
          ["未命中", matchMode === "complete" ? result.leftOnly : 0]
        ]}
        renderCell={(row, column) => (column === "状态" ? <StatusBadge status={(row as JoinedRow).status} /> : row.data[column])}
      />
    </>
  );
}
