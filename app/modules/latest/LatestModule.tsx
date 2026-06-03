import type { OutputRow, TableSlot, WorkbookState } from "@/app/types";
import { FieldSelect } from "@/app/components/FieldSelect";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";
import { TableCard } from "@/app/components/TableCard";

export function LatestModule({
  workbook,
  columns,
  sourceRowsCount,
  baseField,
  timeField,
  loadingSlot,
  result,
  onFile,
  onSheet,
  onBaseField,
  onTimeField,
  onExport
}: {
  workbook: WorkbookState | null;
  columns: string[];
  sourceRowsCount: number;
  baseField: string;
  timeField: string;
  loadingSlot: TableSlot | null;
  result: { rows: OutputRow[]; columns: string[]; groups: number; ignored: number };
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onBaseField: (field: string) => void;
  onTimeField: (field: string) => void;
  onExport: () => void;
}) {
  const canPickLatest = Boolean(workbook && baseField && timeField);

  return (
    <>
      <TableCard
        slot="latest"
        title="数据表"
        workbook={workbook}
        columns={columns}
        loading={loadingSlot === "latest"}
        controlGridClass="sm:grid-cols-3"
        onFile={onFile}
        onSheet={onSheet}
        controls={
          <>
            <FieldSelect label="基准字段" disabled={columns.length === 0} value={baseField} onChange={onBaseField} placeholder="选择基准字段" options={columns} />
            <FieldSelect label="时间字段" disabled={columns.length === 0} value={timeField} onChange={onTimeField} placeholder="时间字段排序" options={columns} />
          </>
        }
      />

      <ResultPanel
        canShow={canPickLatest}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={canPickLatest ? "当前字段没有结果" : "导入表格，选择基准字段和时间字段"}
        metrics={[
          ["原始行数", sourceRowsCount],
          ["基准数量", result.groups],
          ["取最新行", result.rows.length],
          ["空基准忽略", result.ignored]
        ]}
        onExport={onExport}
        renderCell={(row, column) => row.data[column]}
      />
    </>
  );
}
