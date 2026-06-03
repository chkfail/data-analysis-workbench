import type { CollisionTableRuntime, DataRow, JoinedRow, MatchMode } from "@/app/types";
import { formatValue, normalizeKey } from "@/app/lib/workbook";

export function stripCollisionExportPrefix(column: string) {
  return column.replace(/^(左表|右表|基准表|表\d+|参与表 [A-Z]+)\./, "");
}

export function buildCollisionResult({ matchMode, tables }: { matchMode: MatchMode; tables: CollisionTableRuntime[] }) {
  if (tables.length < 2 || tables.some((table) => !table.field || table.rows.length === 0)) {
    return { rows: [] as JoinedRow[], columns: [] as string[], matched: 0, leftOnly: 0 };
  }

  const [baseTable, ...joinTables] = tables;
  const columns = ["状态", ...tables.flatMap((table) => table.columns.map((column) => `${table.title}.${column}`))];
  const indexes = joinTables.map((table) => buildIndex(table.rows, table.field));
  const rawRows = baseTable.rows.flatMap<JoinedRow>((baseRow, baseIndex) => {
    const key = normalizeKey(baseRow[baseTable.field]);
    const matchGroups = indexes.map((index) => (key ? index.get(key) ?? [] : []));
    const fullyMatched = matchGroups.every((group) => group.length > 0);

    if (!fullyMatched) {
      if (matchMode === "collision") return [];
    }

    const normalizedGroups = matchGroups.map((group) => (group.length > 0 ? group : [null]));
    const combinations = cartesianProduct(normalizedGroups);

    return combinations.map((combination, combinationIndex) => {
      const rowsByTable = [baseRow, ...combination];
      return {
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
      };
    });
  });
  const rows = distinctRows(rawRows, columns);
  const matched = rows.filter((row) => row.status === "matched").length;
  const leftOnly = rows.filter((row) => row.status === "left-only").length;

  return { rows, columns, matched, leftOnly };
}

function buildIndex(rows: DataRow[], field: string) {
  return rows.reduce<Map<string, DataRow[]>>((index, row) => {
    const key = normalizeKey(row[field]);
    if (!key) return index;
    const bucket = index.get(key) ?? [];
    bucket.push(row);
    index.set(key, bucket);
    return index;
  }, new Map());
}

function cartesianProduct(groups: Array<Array<DataRow | null>>) {
  return groups.reduce<Array<Array<DataRow | null>>>(
    (acc, group) => acc.flatMap((prefix) => group.map((item) => [...prefix, item])),
    [[]]
  );
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
