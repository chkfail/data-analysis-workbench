"use client";

import { useMemo, useState } from "react";
import type { SearchTableState, TableSlot } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { useComputation } from "@/app/hooks/useComputation";
import { loadWorkbookFile, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import {
  EMPTY_SEARCH_RESULT,
  downloadSearchWorkbook,
  type SearchMode,
} from "@/app/lib/search";
import { applyHeaderRow } from "@/app/lib/workbook";

const initialSearchTables: SearchTableState[] = [
  { id: "search-1", title: "检索表 A", workbook: null, selectedSheets: [] },
  { id: "search-2", title: "检索表 B", workbook: null, selectedSheets: [] },
];

function getSearchTableTitle(index: number) {
  return `检索表 ${String.fromCharCode(65 + index)}`;
}

export function isSearchSlot(slot: TableSlot): slot is `search-${string}` {
  return slot.startsWith("search-");
}

export function useSearchWorkbench(context: WorkbenchContext) {
  const [tables, setTables] = useState<SearchTableState[]>(initialSearchTables);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("contains");
  const [caseSensitive, setCaseSensitive] = useState(false);

  const runtimeTables = useMemo(
    () =>
      tables.map((table) => ({
        ...table,
        selectedRowCount: table.selectedSheets.reduce(
          (sum, sheet) => sum + (table.workbook?.sheets[sheet]?.length ?? 0),
          0,
        ),
      })),
    [tables],
  );
  const input = useMemo(() => {
    if (!query.trim()) return null;
    // 只把选中的工作表交给 Worker，不传原始二维数组
    const tables = runtimeTables.map((table) => ({
      ...table,
      workbook: table.workbook
        ? {
            ...table.workbook,
            raw: {},
            sheets: Object.fromEntries(
              table.selectedSheets.map((sheet) => [sheet, table.workbook?.sheets[sheet] ?? []]),
            ),
          }
        : null,
    }));
    return { tables, query, mode, caseSensitive };
  }, [runtimeTables, query, mode, caseSensitive]);
  const computation = useComputation("search", input, EMPTY_SEARCH_RESULT, {
    delay: 250,
    onError: context.setError,
  });
  // 未输入要素时也要展示选中的表/工作表/行数
  const result = input
    ? computation.result
    : {
        ...EMPTY_SEARCH_RESULT,
        sourceTableCount: runtimeTables.filter((table) => table.workbook).length,
        sourceSheetCount: runtimeTables.reduce((sum, table) => sum + (table.workbook ? table.selectedSheets.length : 0), 0),
        sourceRowCount: runtimeTables.reduce((sum, table) => sum + (table.workbook ? table.selectedRowCount : 0), 0),
      };

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file || !isSearchSlot(slot)) return;

    const workbook = await loadWorkbookFile(slot, file, context);
    if (!workbook) return;
    setTables((currentTables) =>
      currentTables.map((table) =>
        table.id === slot
          ? {
              ...table,
              workbook,
              selectedSheets: Object.keys(workbook.sheets),
            }
          : table,
      ),
    );
  }

  // 检索表可多选工作表，表头行统一应用到该文件的全部工作表
  function updateHeaderRow(slot: TableSlot, headerRow: number) {
    setTables((currentTables) =>
      currentTables.map((table) =>
        table.id === slot && table.workbook
          ? { ...table, workbook: applyHeaderRow(table.workbook, headerRow) }
          : table,
      ),
    );
  }

  function toggleSheet(slot: TableSlot, sheet: string) {
    if (!isSearchSlot(slot)) return;

    setTables((currentTables) =>
      currentTables.map((table) => {
        if (table.id !== slot) return table;
        const selectedSheets = table.selectedSheets.includes(sheet)
          ? table.selectedSheets.filter((item) => item !== sheet)
          : [...table.selectedSheets, sheet];
        return { ...table, selectedSheets };
      }),
    );
  }

  function addTable() {
    setTables((currentTables) => [
      ...currentTables,
      {
        id: `search-${Date.now()}`,
        title: getSearchTableTitle(currentTables.length),
        workbook: null,
        selectedSheets: [],
      },
    ]);
  }

  function removeTable(slot: TableSlot) {
    setTables((currentTables) => {
      if (currentTables.length <= 1) return currentTables;
      return currentTables
        .filter((table) => table.id !== slot)
        .map((table, index) => ({
          ...table,
          title: getSearchTableTitle(index),
        }));
    });
  }

  async function exportResult() {
    await downloadSearchWorkbook(TOOL_DEFINITIONS.search.exportFile, result.exportSheets);
  }

  return {
    tables: runtimeTables,
    query,
    mode,
    caseSensitive,
    result,
    computation,
    setQuery,
    setMode,
    setCaseSensitive,
    handleFile,
    toggleSheet,
    updateHeaderRow,
    addTable,
    removeTable,
    exportResult,
  };
}
