"use client";

import { useMemo, useState } from "react";
import { TOOL_DEFINITIONS } from "@/app/config/tools";
import { useComputation } from "@/app/hooks/useComputation";
import { useWorkbookSlot, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import { EMPTY_EXTRACT_RESULT, type ExtractTemplateId } from "@/app/lib/extract";
import { downloadExcel } from "@/app/lib/workbook";

function toggle<T>(items: T[], item: T) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export function useExtractWorkbench(context: WorkbenchContext) {
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [templates, setTemplates] = useState<ExtractTemplateId[]>(["mobile"]);
  const [customPattern, setCustomPattern] = useState("");
  const slot = useWorkbookSlot(context, () => setSourceFields([]));

  const input = useMemo(
    () =>
      slot.book && sourceFields.length > 0
        ? { rows: slot.rows, columns: slot.columns, sourceFields, templates, customPattern }
        : null,
    [slot.book, slot.rows, slot.columns, sourceFields, templates, customPattern],
  );
  const computation = useComputation("extract", input, EMPTY_EXTRACT_RESULT, {
    delay: 250,
    onError: context.setError,
  });

  async function exportResult() {
    const { exportFile, exportSheet } = TOOL_DEFINITIONS.extract;
    await downloadExcel(exportFile, exportSheet, computation.result.columns, computation.result.rows);
  }

  return {
    ...slot,
    sourceFields,
    templates,
    customPattern,
    setCustomPattern,
    toggleSourceField: (field: string) => setSourceFields((fields) => toggle(fields, field)),
    toggleTemplate: (template: ExtractTemplateId) => setTemplates((items) => toggle(items, template)),
    result: computation.result,
    computation,
    exportResult,
  };
}
