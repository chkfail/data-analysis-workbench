"use client";

import { useMemo, useState } from "react";
import type { CollisionTableState, MatchMode, TableSlot } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { useComputation } from "@/app/hooks/useComputation";
import { getActiveRows, loadWorkbookFile, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import { EMPTY_COLLISION_RESULT, stripCollisionExportPrefix } from "@/app/lib/collision";
import { applyHeaderRow, downloadExcel, getColumns } from "@/app/lib/workbook";

const initialTables: CollisionTableState[] = [
  { id: "collision-1", title: "基准表", workbook: null, field: "" },
  { id: "collision-2", title: "参与表 A", workbook: null, field: "" },
];

function getTableTitle(index: number) {
  if (index === 0) return "基准表";
  return `参与表 ${String.fromCharCode(64 + index)}`;
}

export function useCollisionWorkbench(context: WorkbenchContext) {
  const [matchMode, setMatchMode] = useState<MatchMode>("complete");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [tables, setTables] = useState<CollisionTableState[]>(initialTables);

  const runtimeTables = useMemo(
    () =>
      tables.map((table) => {
        const rows = getActiveRows(table.workbook);
        return { ...table, rows, columns: getColumns(rows) };
      }),
    [tables],
  );
  const input = useMemo(() => {
    const ready = runtimeTables.length >= 2 && runtimeTables.every((table) => table.workbook && table.field);
    if (!ready) return null;
    // Worker 只需要行和字段，不传整个 workbook，减少跨线程拷贝
    return {
      matchMode,
      caseSensitive,
      tables: runtimeTables.map((table) => ({ ...table, workbook: null })),
    };
  }, [runtimeTables, matchMode, caseSensitive]);
  const computation = useComputation("collision", input, EMPTY_COLLISION_RESULT, {
    onError: context.setError,
  });

  function updateTable(slot: TableSlot, update: (table: CollisionTableState) => CollisionTableState) {
    setTables((current) => current.map((table) => (table.id === slot ? update(table) : table)));
  }

  async function handleFile(slot: TableSlot, file?: File) {
    if (!file) return;
    const workbook = await loadWorkbookFile(slot, file, context);
    if (workbook) updateTable(slot, (table) => ({ ...table, workbook, field: "" }));
  }

  function updateSheet(slot: TableSlot, sheet: string) {
    updateTable(slot, (table) =>
      table.workbook ? { ...table, workbook: { ...table.workbook, activeSheet: sheet }, field: "" } : table,
    );
  }

  function updateHeaderRow(slot: TableSlot, headerRow: number) {
    updateTable(slot, (table) =>
      table.workbook
        ? { ...table, workbook: applyHeaderRow(table.workbook, headerRow, [table.workbook.activeSheet]), field: "" }
        : table,
    );
  }

  function updateField(slot: TableSlot, field: string) {
    updateTable(slot, (table) => ({ ...table, field }));
  }

  function addTable() {
    setTables((current) => [
      ...current,
      { id: `collision-${Date.now()}`, title: getTableTitle(current.length), workbook: null, field: "" },
    ]);
  }

  function removeTable(slot: TableSlot) {
    setTables((current) => {
      if (current.length <= 2) return current;
      return current
        .filter((table) => table.id !== slot)
        .map((table, index) => ({ ...table, title: getTableTitle(index) }));
    });
  }

  async function exportResult() {
    const { exportFile, exportSheet } = TOOL_DEFINITIONS.collision;
    await downloadExcel(
      exportFile,
      exportSheet,
      computation.result.columns,
      computation.result.rows,
      stripCollisionExportPrefix,
    );
  }

  return {
    tables: runtimeTables,
    matchMode,
    caseSensitive,
    setMatchMode,
    setCaseSensitive,
    handleFile,
    updateSheet,
    updateHeaderRow,
    updateField,
    addTable,
    removeTable,
    result: computation.result,
    computation,
    exportResult,
  };
}
