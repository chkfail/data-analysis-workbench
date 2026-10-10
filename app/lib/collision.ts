import type { CollisionTableRuntime, DataRow, JoinedRow, MatchMode } from "@/app/types";
import { formatValue } from "@/app/lib/workbook";

/** 单次碰撞最多生成的结果行数；超过时截断并提示，避免重复键导致笛卡尔积撑爆内存 */
export const MAX_COLLISION_ROWS = 200_000;

export type CollisionResult = {
  rows: JoinedRow[];
  columns: string[];
  matched: number;
  leftOnly: number;
  /** 去重前预计生成的行数 */
  estimatedRows: number;
  truncated: boolean;
};

export const EMPTY_COLLISION_RESULT: CollisionResult = {
  rows: [],
  columns: [],
  matched: 0,
  leftOnly: 0,
  estimatedRows: 0,
  truncated: false,
};

export function stripCollisionExportPrefix(column: string) {
  return column.replace(/^(左表|右表|基准表|表\d+|参与表 [A-Z]+)\./, "");
}

export function buildCollisionResult({
  matchMode,
  tables,
  caseSensitive
}: {
  matchMode: MatchMode;
  tables: CollisionTableRuntime[];
  caseSensitive: boolean;
}): CollisionResult {
  if (tables.length < 2 || tables.some((table) => !table.field || table.rows.length === 0)) {
    return EMPTY_COLLISION_RESULT;
  }

  const [baseTable, ...joinTables] = tables;
  const columns = ["状态", ...tables.flatMap((table) => table.columns.map((column) => `${table.title}.${column}`))];
  const indexes = joinTables.map((table) => buildIndex(table.rows, table.field, caseSensitive));
  const plans = baseTable.rows.map((baseRow) => {
    const key = normalizeMatchKey(baseRow[baseTable.field], caseSensitive);
    const matchGroups = indexes.map((index) => (key ? index.get(key) ?? [] : []));
    const fullyMatched = matchGroups.every((group) => group.length > 0);
    const size = fullyMatched || matchMode === "complete" ? matchGroups.reduce((product, group) => product * Math.max(group.length, 1), 1) : 0;
    return { baseRow, matchGroups, fullyMatched, size };
  });
  const estimatedRows = plans.reduce((sum, plan) => sum + plan.size, 0);
  const truncated = estimatedRows > MAX_COLLISION_ROWS;
  const rawRows: JoinedRow[] = [];

  for (let baseIndex = 0; baseIndex < plans.length && rawRows.length < MAX_COLLISION_ROWS; baseIndex += 1) {
    const { baseRow, matchGroups, fullyMatched, size } = plans[baseIndex];
    if (size === 0) continue;

    const normalizedGroups = matchGroups.map((group) => (group.length > 0 ? group : [null]));
    const combinations = cartesianProduct(normalizedGroups, MAX_COLLISION_ROWS - rawRows.length);

    combinations.forEach((combination, combinationIndex) => {
      const rowsByTable = [baseRow, ...combination];
      rawRows.push({
        id: `${baseIndex}-${combinationIndex}`,
        status: fullyMatched ? "matched" : "left-only",
        data: {
          状态: fullyMatched ? "命中" : "未命中",
          ...Object.fromEntries(
            tables.flatMap((table, tableIndex) =>
              table.columns.map((column) => [`${table.title}.${column}`, rowsByTable[tableIndex] ? formatValue(rowsByTable[tableIndex]?.[column]) : ""])
            )
          )
        }
      });
    });
  }

  const rows = distinctRows(rawRows, columns);
  const matched = rows.filter((row) => row.status === "matched").length;
  const leftOnly = rows.filter((row) => row.status === "left-only").length;

  return { rows, columns, matched, leftOnly, estimatedRows, truncated };
}

function buildIndex(rows: DataRow[], field: string, caseSensitive: boolean) {
  return rows.reduce<Map<string, DataRow[]>>((index, row) => {
    const key = normalizeMatchKey(row[field], caseSensitive);
    if (!key) return index;
    const bucket = index.get(key) ?? [];
    bucket.push(row);
    index.set(key, bucket);
    return index;
  }, new Map());
}

function normalizeMatchKey(value: unknown, caseSensitive: boolean) {
  const normalized = String(value ?? "").trim();
  return caseSensitive ? normalized : normalized.toLowerCase();
}

function cartesianProduct(groups: Array<Array<DataRow | null>>, limit: number) {
  const result: Array<Array<DataRow | null>> = [];
  const current: Array<DataRow | null> = [];

  const walk = (depth: number) => {
    if (result.length >= limit) return;
    if (depth === groups.length) {
      result.push([...current]);
      return;
    }
    for (const item of groups[depth]) {
      current[depth] = item;
      walk(depth + 1);
      if (result.length >= limit) return;
    }
  };

  walk(0);
  return result;
}

function distinctRows(rows: JoinedRow[], columns: string[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = JSON.stringify(columns.map((column) => row.data[column] ?? ""));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
