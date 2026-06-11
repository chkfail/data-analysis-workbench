import type {
  DiffMode,
  DiffRow,
  OutputRow,
  TableSlot,
  WorkbookState,
} from "@/app/types";
import type { DiffMapping, DiffResult } from "@/app/lib/diff";
import { ResultPanel, MAX_PREVIEW_ROWS } from "@/app/components/ResultPanel";
import { TableCard } from "@/app/components/TableCard";

export function DiffModule({
  oldBook,
  newBook,
  oldColumns,
  newColumns,
  mode,
  mapping,
  loadingSlot,
  result,
  caseSensitive,
  onFile,
  onSheet,
  onMappingChange,
  onExport,
}: {
  oldBook: WorkbookState | null;
  newBook: WorkbookState | null;
  oldColumns: string[];
  newColumns: string[];
  mode: DiffMode;
  mapping: DiffMapping;
  loadingSlot: TableSlot | null;
  result: DiffResult;
  caseSensitive: boolean;
  onFile: (slot: TableSlot, file?: File) => void;
  onSheet: (slot: TableSlot, sheet: string) => void;
  onMappingChange: (mapping: DiffMapping) => void;
  onExport: () => void;
}) {
  const canDiff = Boolean(
    oldBook &&
    newBook &&
    (mode === "unkeyed" ||
      (mapping.oldFields.length > 0 && mapping.newFields.length > 0)) &&
    result.columns.length > 0,
  );
  const oldRowsCount = oldBook
    ? (oldBook.sheets[oldBook.activeSheet]?.length ?? 0)
    : 0;
  const newRowsCount = newBook
    ? (newBook.sheets[newBook.activeSheet]?.length ?? 0)
    : 0;

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <TableCard
          slot="diff-old"
          title="旧表"
          workbook={oldBook}
          columns={oldColumns}
          loading={loadingSlot === "diff-old"}
          controlGridClass="sm:grid-cols-1"
          hideColumnPreview
          sheetAsChips
          controls={
            oldBook && mode === "keyed" ? (
              <FieldChipPicker
                title="旧表对齐字段"
                columns={oldColumns}
                selected={mapping.oldFields}
                onToggle={(field) =>
                  onMappingChange({
                    ...mapping,
                    oldFields: mapping.oldFields.includes(field)
                      ? mapping.oldFields.filter((f) => f !== field)
                      : [...mapping.oldFields, field],
                  })
                }
              />
            ) : undefined
          }
          onFile={onFile}
          onSheet={onSheet}
        />
        <TableCard
          slot="diff-new"
          title="新表"
          workbook={newBook}
          columns={newColumns}
          loading={loadingSlot === "diff-new"}
          controlGridClass="sm:grid-cols-1"
          hideColumnPreview
          sheetAsChips
          controls={
            newBook && mode === "keyed" ? (
              <FieldChipPicker
                title="新表对齐字段"
                columns={newColumns}
                selected={mapping.newFields}
                onToggle={(field) =>
                  onMappingChange({
                    ...mapping,
                    newFields: mapping.newFields.includes(field)
                      ? mapping.newFields.filter((f) => f !== field)
                      : [...mapping.newFields, field],
                  })
                }
              />
            ) : undefined
          }
          onFile={onFile}
          onSheet={onSheet}
        />
      </section>

      <ResultPanel
        canShow={canDiff}
        rows={result.rows}
        columns={result.columns}
        previewRows={result.rows.slice(0, MAX_PREVIEW_ROWS)}
        emptyText={
          canDiff
            ? "当前没有差异结果"
            : mode === "keyed"
              ? "导入两张表，选择对齐字段"
              : "导入两张表后自动按内容比对"
        }
        metrics={[
          ["旧表", oldRowsCount, "行"],
          ["新表", newRowsCount, "行"],
          ["新增", result.addedCount, "行"],
          ["删除", result.deletedCount, "行"],
          ["修改", result.modifiedCount, "行"],
          ["一致", result.unchangedCount, "行"],
        ]}
        note={[
          mode === "keyed" && result.duplicateKeyCount > 0
            ? "对齐字段存在重复，已按出现顺序配对"
            : "",
          caseSensitive ? "区分大小写" : "不区分大小写",
        ]
          .filter(Boolean)
          .join("；")}
        onExport={onExport}
        getRowClassName={(row) => {
          const status = (row as DiffRow).diffStatus;
          if (status === "added") return "bg-green-50";
          if (status === "deleted") return "bg-red-50 text-slate-400";
          if (status === "modified") return "bg-amber-50";
          return "";
        }}
        renderCell={(row, column) => renderDiffCell(row, column)}
      />
    </>
  );
}

function FieldChipPicker({
  title,
  columns,
  selected,
  onToggle,
}: {
  title: string;
  columns: string[];
  selected: string[];
  onToggle: (field: string) => void;
}) {
  return (
    <div className="grid gap-2 text-xs font-bold text-slate-500">
      {title}
      <div className="h-36 overflow-auto rounded-2xl border border-line bg-paper/70 p-2">
        <div className="flex flex-wrap gap-2">
          {columns.map((column) => (
            <button
              key={column}
              className={[
                "chip",
                selected.includes(column) ? "chip-on" : "chip-off",
              ].join(" ")}
              type="button"
              onClick={() => onToggle(column)}
              title={column}
            >
              {column}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderDiffCell(row: OutputRow, column: string) {
  if (column === "比对结果") {
    const status = (row as DiffRow).diffStatus;
    const colors = {
      added: "bg-green-100 text-green-800",
      deleted: "bg-red-100 text-red-800",
      modified: "bg-amber-100 text-amber-800",
      unchanged: "bg-slate-100 text-slate-500",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ${colors[status]}`}
      >
        {row.data[column]}
      </span>
    );
  }

  if (column === "变更字段" && !row.data[column]) {
    return <span className="text-slate-300">—</span>;
  }

  return row.data[column];
}
