"use client";

import { useMemo, useState } from "react";
import type { SearchTableState, TableSlot } from "@/app/types";
import {
  buildSearchResult,
  downloadSearchWorkbook,
  type SearchMode,
} from "@/app/lib/search";
import { parseWorkbook } from "@/app/lib/workbook";

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

export function useSearchWorkbench({
  exportFile,
  setError,
  setLoadingSlot,
}: {
  exportFile: string;
  setError: (error: string) => void;
  setLoadingSlot: (slot: TableSlot | null) => void;
}) {
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
  const result = useMemo(
    () => buildSearchResult({ tables: runtimeTables, query, mode, caseSensitive }),
    [runtimeTables, query, mode, caseSensitive],
  );

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file || !isSearchSlot(slot)) return;

    setError("");
    setLoadingSlot(slot);

    try {
      const workbook = await parseWorkbook(file);
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
    } catch {
      setError("文件解析失败，请上传 .xlsx / .csv 文件。");
    } finally {
      setLoadingSlot(null);
    }
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
    await downloadSearchWorkbook(exportFile, result.exportSheets);
  }

  return {
    tables: runtimeTables,
    query,
    mode,
    caseSensitive,
    result,
    setQuery,
    setMode,
    setCaseSensitive,
    handleFile,
    toggleSheet,
    addTable,
    removeTable,
    exportResult,
  };
}
