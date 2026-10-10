"use client";

import { useMemo, useState } from "react";
import type {
  DataRow,
  MergeTableState,
  TableSlot,
  WorkbookState,
} from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { useComputation } from "@/app/hooks/useComputation";
import { loadWorkbookFile, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import { EMPTY_MERGE_RESULT } from "@/app/lib/merge";
import {
  applyHeaderRow,
  describeParseError,
  downloadExcel,
  getColumns,
  parseWorkbook,
} from "@/app/lib/workbook";

const initialMergeTables: MergeTableState[] = [];

function getMergeTableTitle(index: number) {
  return `参与表 ${String.fromCharCode(65 + index)}`;
}

function createMergeTableId(): `merge-${string}` {
  return `merge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isMergeSlot(
  slot: TableSlot,
): slot is `merge-${string}` | "merge-base" {
  return slot === "merge-base" || slot.startsWith("merge-");
}

function isMergeTableSlot(slot: TableSlot): slot is `merge-${string}` {
  return slot.startsWith("merge-") && slot !== "merge-base";
}

export function useMergeWorkbench(context: WorkbenchContext) {
  const { setError } = context;
  const [baseBook, setBaseBook] = useState<WorkbookState | null>(null);
  const [mergeTables, setMergeTables] =
    useState<MergeTableState[]>(initialMergeTables);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [deduplicate, setDeduplicate] = useState(true);
  const [isAddingFiles, setIsAddingFiles] = useState(false);

  const baseColumns = useMemo(() => {
    if (!baseBook) return [];
    const rows = baseBook.sheets[baseBook.activeSheet] ?? [];
    return getColumns(rows);
  }, [baseBook]);

  const baseRows = useMemo(() => {
    if (!baseBook) return [];
    return baseBook.sheets[baseBook.activeSheet] ?? [];
  }, [baseBook]);

  const baseSourceName = useMemo(() => baseBook?.name ?? "基准表", [baseBook]);

  const runtimeTables = useMemo(
    () =>
      mergeTables.map((table) => {
        const allRows: DataRow[] = [];
        const allColumns = new Set<string>();
        if (table.workbook) {
          Object.values(table.workbook.sheets).forEach((sheetRows) => {
            allRows.push(...sheetRows);
            getColumns(sheetRows).forEach((column) => allColumns.add(column));
          });
        }
        return {
          ...table,
          rows: allRows,
          columns: Array.from(allColumns),
        };
      }),
    [mergeTables],
  );

  const input = useMemo(() => {
    if (!baseBook) return null;
    // 合并逻辑按 workbook.sheets 逐个工作表处理，不需要拼好的 rows 和原始二维数组
    const tables = runtimeTables.map((table) => ({
      ...table,
      rows: [],
      workbook: table.workbook ? { ...table.workbook, raw: {} } : null,
    }));
    return { baseColumns, baseRows, baseSourceName, tables, fieldMapping, deduplicate };
  }, [baseBook, baseColumns, baseRows, baseSourceName, runtimeTables, fieldMapping, deduplicate]);
  const computation = useComputation("merge", input, EMPTY_MERGE_RESULT, {
    onError: setError,
  });
  const result = computation.result;

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file || !isMergeSlot(slot)) return;

    const workbook = await loadWorkbookFile(slot, file, context);
    if (!workbook) return;

    if (slot === "merge-base") {
      setBaseBook(workbook);
      return;
    }

    setMergeTables((currentTables) =>
      currentTables.map((table) =>
        table.id === slot ? { ...table, workbook } : table,
      ),
    );
  }

  function updateSheet(slot: TableSlot, sheet: string) {
    if (slot !== "merge-base" || !baseBook) return;
    setBaseBook({ ...baseBook, activeSheet: sheet });
  }

  // 基准表只改当前工作表；参与表全部工作表都参与合并，表头行统一应用
  function updateHeaderRow(slot: TableSlot, headerRow: number) {
    if (slot === "merge-base") {
      if (baseBook) setBaseBook(applyHeaderRow(baseBook, headerRow, [baseBook.activeSheet]));
      return;
    }
    setMergeTables((currentTables) =>
      currentTables.map((table) =>
        table.id === slot && table.workbook
          ? { ...table, workbook: applyHeaderRow(table.workbook, headerRow) }
          : table,
      ),
    );
  }

  async function exportResult() {
    const { exportFile, exportSheet } = TOOL_DEFINITIONS.merge;
    await downloadExcel(exportFile, exportSheet, result.columns, result.rows);
  }

  function addTable() {
    setMergeTables((currentTables) => [
      ...currentTables,
      {
        id: createMergeTableId(),
        title: getMergeTableTitle(currentTables.length),
        workbook: null,
      },
    ]);
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setError("");
    setIsAddingFiles(true);

    const results = await Promise.allSettled(
      fileArray.map((file) => parseWorkbook(file)),
    );

    const workbooks: WorkbookState[] = [];
    const failedNames: string[] = [];

    results.forEach((settled, index) => {
      if (settled.status === "fulfilled") {
        workbooks.push(settled.value);
      } else {
        failedNames.push(`${fileArray[index].name}（${describeParseError(settled.reason)}）`);
      }
    });

    if (workbooks.length > 0) {
      setMergeTables((currentTables) => {
        const startIndex = currentTables.length;
        return [
          ...currentTables,
          ...workbooks.map((workbook, index) => ({
            id: createMergeTableId(),
            title: getMergeTableTitle(startIndex + index),
            workbook,
          })),
        ];
      });
    }

    if (failedNames.length > 0) {
      setError(`${failedNames.join("、")} 解析失败。`);
    }

    setIsAddingFiles(false);
  }

  function removeTable(slot: TableSlot) {
    if (!isMergeTableSlot(slot)) return;
    setMergeTables((currentTables) => {
      if (currentTables.length <= 1) return currentTables;
      return currentTables
        .filter((table) => table.id !== slot)
        .map((table, index) => ({
          ...table,
          title: getMergeTableTitle(index),
        }));
    });
  }

  function updateFieldMapping(sourceField: string, baseField: string) {
    setFieldMapping((mapping) => ({
      ...mapping,
      [sourceField]: baseField,
    }));
  }

  function removeFieldMapping(sourceField: string) {
    setFieldMapping((mapping) => {
      const next = { ...mapping };
      delete next[sourceField];
      return next;
    });
  }

  return {
    baseBook,
    tables: runtimeTables,
    baseColumns,
    fieldMapping,
    deduplicate,
    result,
    computation,
    setDeduplicate,
    handleFile,
    updateSheet,
    updateHeaderRow,
    exportResult,
    addTable,
    addFiles,
    removeTable,
    updateFieldMapping,
    removeFieldMapping,
    isAddingFiles,
  };
}
