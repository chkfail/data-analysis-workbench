"use client";

import { useMemo, useState } from "react";
import type { DataRow, TableSlot, WorkbookState } from "@/app/types";
import { applyHeaderRow, describeParseError, getColumns, parseWorkbook } from "@/app/lib/workbook";

export type WorkbenchContext = {
  setError: (error: string) => void;
  setLoadingSlot: (slot: TableSlot | null) => void;
};

const EMPTY_ROWS: DataRow[] = [];

/** 解析文件并统一处理 loading 和错误提示；失败返回 null。 */
export async function loadWorkbookFile(
  slot: TableSlot,
  file: File,
  { setError, setLoadingSlot }: WorkbenchContext,
) {
  setError("");
  setLoadingSlot(slot);
  try {
    return await parseWorkbook(file);
  } catch (error) {
    setError(describeParseError(error));
    return null;
  } finally {
    setLoadingSlot(null);
  }
}

export function getActiveRows(workbook: WorkbookState | null) {
  return workbook?.sheets[workbook.activeSheet] ?? EMPTY_ROWS;
}

/**
 * 单个表槽位：导入、切换工作表、修改表头行。
 * 三种操作都会让字段失效，统一触发 onReset 清空字段选择。
 */
export function useWorkbookSlot(context: WorkbenchContext, onReset: () => void) {
  const [book, setBook] = useState<WorkbookState | null>(null);
  const rows = getActiveRows(book);
  const columns = useMemo(() => getColumns(rows), [rows]);

  async function loadFile(slot: TableSlot, file?: File) {
    if (!file) return;
    const workbook = await loadWorkbookFile(slot, file, context);
    if (!workbook) return;
    setBook(workbook);
    onReset();
  }

  function selectSheet(sheet: string) {
    if (!book) return;
    setBook({ ...book, activeSheet: sheet });
    onReset();
  }

  function setHeaderRow(headerRow: number) {
    if (!book) return;
    setBook(applyHeaderRow(book, headerRow, [book.activeSheet]));
    onReset();
  }

  return { book, rows, columns, loadFile, selectSheet, setHeaderRow };
}
