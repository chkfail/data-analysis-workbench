"use client";

import { useMemo, useState } from "react";
import { useComputation } from "@/app/hooks/useComputation";
import { useWorkbookSlot, type WorkbenchContext } from "@/app/hooks/useWorkbookSlot";
import { EMPTY_DEDUP_RESULT, type BlockSize, type DedupMode } from "@/app/lib/dedup";
import { downloadExcel } from "@/app/lib/workbook";

function toggle(items: string[], item: string) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export function useDedupWorkbench(context: WorkbenchContext) {
  const [fields, setFields] = useState<string[]>([]);
  const [exactFields, setExactFields] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState<DedupMode>("levenshtein");
  const [threshold, setThreshold] = useState(0.75);
  const [blockSize, setBlockSize] = useState<BlockSize>("first-char");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const slot = useWorkbookSlot(context, () => {
    setFields([]);
    setExactFields([]);
  });

  const input = useMemo(
    () =>
      slot.book && fields.length > 0
        ? {
            rows: slot.rows,
            columns: slot.columns,
            fields,
            exactFields,
            algorithm,
            threshold,
            blockSize,
            caseSensitive,
          }
        : null,
    [slot.book, slot.rows, slot.columns, fields, exactFields, algorithm, threshold, blockSize, caseSensitive],
  );
  const computation = useComputation("dedup", input, EMPTY_DEDUP_RESULT, {
    delay: 200,
    onError: context.setError,
  });
  const result = computation.result;

  // 推荐导出：去重后的推荐保留行 + 独立行，去掉标记列
  async function exportRecommended() {
    const recommendedRows = result.rows.filter(
      (row) => row.data["推荐保留"] === "★ 推荐保留" || !row.data["重复组"],
    );
    await downloadExcel("模糊去重结果_推荐.xlsx", "去重结果", slot.columns, recommendedRows);
  }

  async function exportFull() {
    await downloadExcel("模糊去重结果_全量.xlsx", "去重结果", result.columns, result.rows);
  }

  return {
    ...slot,
    fields,
    exactFields,
    algorithm,
    threshold,
    blockSize,
    caseSensitive,
    setAlgorithm,
    setThreshold,
    setBlockSize,
    setCaseSensitive,
    toggleField: (field: string) => setFields((items) => toggle(items, field)),
    toggleExactField: (field: string) => setExactFields((items) => toggle(items, field)),
    result,
    computation,
    exportRecommended,
    exportFull,
  };
}
