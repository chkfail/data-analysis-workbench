"use client";

import { useMemo, useState } from "react";
import type { DiffMode, TableSlot } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { useComputation } from "@/app/hooks/useComputation";
import { useWorkbookSlot, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import { EMPTY_DIFF_RESULT, type DiffMapping } from "@/app/lib/diff";
import { downloadExcel } from "@/app/lib/workbook";

export function useDiffWorkbench(context: WorkbenchContext) {
  const [mode, setMode] = useState<DiffMode>("unkeyed");
  const [mapping, setMapping] = useState<DiffMapping>({ oldFields: [], newFields: [] });
  const [caseSensitive, setCaseSensitive] = useState(false);
  const oldSlot = useWorkbookSlot(context, () => setMapping({ oldFields: [], newFields: [] }));
  const newSlot = useWorkbookSlot(context, () => setMapping((current) => ({ ...current, newFields: [] })));

  const bothLoaded = Boolean(oldSlot.book && newSlot.book);
  const keyedInput = useMemo(
    () =>
      bothLoaded && mode === "keyed" && mapping.oldFields.length > 0 && mapping.newFields.length > 0
        ? {
            oldRows: oldSlot.rows,
            oldColumns: oldSlot.columns,
            newRows: newSlot.rows,
            newColumns: newSlot.columns,
            mapping,
            caseSensitive,
          }
        : null,
    [bothLoaded, mode, oldSlot.rows, oldSlot.columns, newSlot.rows, newSlot.columns, mapping, caseSensitive],
  );
  const unkeyedInput = useMemo(
    () =>
      bothLoaded && mode === "unkeyed"
        ? {
            oldRows: oldSlot.rows,
            oldColumns: oldSlot.columns,
            newRows: newSlot.rows,
            newColumns: newSlot.columns,
            caseSensitive,
          }
        : null,
    [bothLoaded, mode, oldSlot.rows, oldSlot.columns, newSlot.rows, newSlot.columns, caseSensitive],
  );
  const keyed = useComputation("diffKeyed", keyedInput, EMPTY_DIFF_RESULT, { onError: context.setError });
  const unkeyed = useComputation("diffUnkeyed", unkeyedInput, EMPTY_DIFF_RESULT, { onError: context.setError });
  const computation = mode === "keyed" ? keyed : unkeyed;

  function pick(slot: TableSlot) {
    return slot === "diff-old" ? oldSlot : newSlot;
  }

  async function exportResult() {
    const { exportFile, exportSheet } = TOOL_DEFINITIONS.diff;
    await downloadExcel(exportFile, exportSheet, computation.result.columns, computation.result.rows);
  }

  return {
    oldSlot,
    newSlot,
    mode,
    mapping,
    caseSensitive,
    setMode,
    setMapping,
    setCaseSensitive,
    handleFile: (slot: TableSlot, file?: File) => pick(slot).loadFile(slot, file),
    updateSheet: (slot: TableSlot, sheet: string) => pick(slot).selectSheet(sheet),
    updateHeaderRow: (slot: TableSlot, headerRow: number) => pick(slot).setHeaderRow(headerRow),
    result: computation.result,
    computation,
    exportResult,
  };
}
