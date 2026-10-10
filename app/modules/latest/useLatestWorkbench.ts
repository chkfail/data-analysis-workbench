"use client";

import { useMemo, useState } from "react";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { useComputation } from "@/app/hooks/useComputation";
import { useWorkbookSlot, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import { EMPTY_LATEST_RESULT } from "@/app/lib/latest";
import { downloadExcel } from "@/app/lib/workbook";

export function useLatestWorkbench(context: WorkbenchContext) {
  const [baseField, setBaseField] = useState("");
  const [timeField, setTimeField] = useState("");
  const slot = useWorkbookSlot(context, () => {
    setBaseField("");
    setTimeField("");
  });

  const input = useMemo(
    () =>
      slot.book && baseField && timeField
        ? { rows: slot.rows, columns: slot.columns, baseField, timeField }
        : null,
    [slot.book, slot.rows, slot.columns, baseField, timeField],
  );
  const computation = useComputation("latest", input, EMPTY_LATEST_RESULT, {
    onError: context.setError,
  });

  async function exportResult() {
    const { exportFile, exportSheet } = TOOL_DEFINITIONS.latest;
    await downloadExcel(exportFile, exportSheet, computation.result.columns, computation.result.rows);
  }

  return {
    ...slot,
    baseField,
    timeField,
    setBaseField,
    setTimeField,
    result: computation.result,
    computation,
    exportResult,
  };
}
