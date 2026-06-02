import type { DataRow, JoinedRow, MatchMode } from "@/app/types";
import { formatValue, normalizeKey } from "@/app/lib/workbook";

export function stripCollisionExportPrefix(column: string) {
  return column.replace(/^(左表|右表)\./, "");
}

export function buildCollisionResult({
  matchMode,
  leftRows,
  rightRows,
  leftColumns,
  rightColumns,
  leftField,
  rightField
}: {
  matchMode: MatchMode;
  leftRows: DataRow[];
  rightRows: DataRow[];
  leftColumns: string[];
  rightColumns: string[];
  leftField: string;
  rightField: string;
}) {
  if (!leftField || !rightField || leftRows.length === 0 || rightRows.length === 0) {
    return { rows: [] as JoinedRow[], columns: [] as string[], matched: 0, leftOnly: 0 };
  }

  const rightIndex = rightRows.reduce<Map<string, DataRow[]>>((index, row) => {
    const key = normalizeKey(row[rightField]);
    if (!key) return index;
    const bucket = index.get(key) ?? [];
    bucket.push(row);
    index.set(key, bucket);
    return index;
  }, new Map());

  const leftPrefixed = leftColumns.map((column) => `左表.${column}`);
  const rightPrefixed = rightColumns.map((column) => `右表.${column}`);
  const columns = ["状态", ...leftPrefixed, ...rightPrefixed];
  let matched = 0;
  let leftOnly = 0;

  const rows = leftRows.flatMap<JoinedRow>((leftRow, leftIndex) => {
    const key = normalizeKey(leftRow[leftField]);
    const matches = key ? rightIndex.get(key) ?? [] : [];

    if (matches.length === 0) {
      if (matchMode === "collision") return [];
      leftOnly += 1;
      return [
        {
          id: `${leftIndex}-empty`,
          status: "left-only",
          data: {
            状态: "未命中",
            ...Object.fromEntries(leftColumns.map((column) => [`左表.${column}`, formatValue(leftRow[column])])),
            ...Object.fromEntries(rightColumns.map((column) => [`右表.${column}`, ""]))
          }
        }
      ];
    }

    matched += matches.length;
    return matches.map((rightRow, matchIndex) => ({
      id: `${leftIndex}-${matchIndex}`,
      status: "matched" as const,
      data: {
        状态: "命中",
        ...Object.fromEntries(leftColumns.map((column) => [`左表.${column}`, formatValue(leftRow[column])])),
        ...Object.fromEntries(rightColumns.map((column) => [`右表.${column}`, formatValue(rightRow[column])]))
      }
    }));
  });

  return { rows, columns, matched, leftOnly };
}
