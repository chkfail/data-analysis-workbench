"use client";

import { useMemo, useState } from "react";
import type {
  DataRow,
  MergeTableState,
  TableSlot,
  WorkbookState,
} from "@/app/types";
import { buildMergeResult } from "@/app/lib/merge";
import { getColumns, parseWorkbook } from "@/app/lib/workbook";

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

export function useMergeWorkbench({
  setError,
  setLoadingSlot,
}: {
  setError: (error: string) => void;
  setLoadingSlot: (slot: TableSlot | null) => void;
}) {
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

  const result = useMemo(
    () =>
      buildMergeResult({
        baseColumns,
        baseRows,
        baseSourceName,
        tables: runtimeTables,
        fieldMapping,
        deduplicate,
      }),
    [baseColumns, baseRows, baseSourceName, runtimeTables, fieldMapping, deduplicate],
  );

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file || !isMergeSlot(slot)) return;

    setError("");
    setLoadingSlot(slot);

    try {
      const workbook = await parseWorkbook(file);

      if (slot === "merge-base") {
        setBaseBook(workbook);
        return;
      }

      setMergeTables((currentTables) =>
        currentTables.map((table) =>
          table.id === slot ? { ...table, workbook } : table,
        ),
      );
    } catch {
      setError("文件解析失败，请上传 .xlsx / .csv 文件。");
    } finally {
      setLoadingSlot(null);
    }
  }

  function updateSheet(slot: TableSlot, sheet: string) {
    if (slot !== "merge-base" || !baseBook) return;
    setBaseBook({ ...baseBook, activeSheet: sheet });
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

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        workbooks.push(result.value);
      } else {
        failedNames.push(fileArray[index].name);
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
      setError(`${failedNames.join("、")} 解析失败，请检查格式。`);
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
    setDeduplicate,
    handleFile,
    updateSheet,
    addTable,
    addFiles,
    removeTable,
    updateFieldMapping,
    removeFieldMapping,
    isAddingFiles,
  };
}
