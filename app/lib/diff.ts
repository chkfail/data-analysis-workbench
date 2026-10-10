import type { DataRow, DiffRow, DiffRowStatus } from "@/app/types";
import { formatValue } from "@/app/lib/workbook";

/** 按内容比对时，剩余行配成"修改"所需的最低字段一致比例 */
const CONTENT_MATCH_THRESHOLD = 0.7;

export type DiffMapping = {
  oldFields: string[];
  newFields: string[];
};

export type DiffResult = {
  rows: DiffRow[];
  columns: string[];
  addedCount: number;
  deletedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  duplicateKeyCount: number;
};

export const EMPTY_DIFF_RESULT: DiffResult = {
  rows: [],
  columns: [],
  addedCount: 0,
  deletedCount: 0,
  modifiedCount: 0,
  unchangedCount: 0,
  duplicateKeyCount: 0,
};

export function buildKeyedDiffResult({
  oldRows,
  oldColumns,
  newRows,
  newColumns,
  mapping,
  caseSensitive,
}: {
  oldRows: DataRow[];
  oldColumns: string[];
  newRows: DataRow[];
  newColumns: string[];
  mapping: DiffMapping;
  caseSensitive: boolean;
}): DiffResult {
  if (
    (oldRows.length === 0 && newRows.length === 0) ||
    mapping.oldFields.length === 0 ||
    mapping.newFields.length === 0
  ) {
    return EMPTY_DIFF_RESULT;
  }

  const columns = buildOutputColumns(oldColumns, newColumns);
  const compareColumns = buildComparableColumns(
    oldColumns,
    newColumns,
    columns,
  );
  const oldBuckets = buildRowBuckets(oldRows, mapping.oldFields, caseSensitive);
  const newBuckets = buildRowBuckets(newRows, mapping.newFields, caseSensitive);
  const duplicateKeyCount =
    oldBuckets.duplicateCount + newBuckets.duplicateCount;
  const allKeys = Array.from(
    new Set([
      ...Array.from(oldBuckets.buckets.keys()),
      ...Array.from(newBuckets.buckets.keys()),
    ]),
  );
  const rows: DiffRow[] = [];

  allKeys.forEach((key, index) => {
    const oldGroup = oldBuckets.buckets.get(key) ?? [];
    const newGroup = newBuckets.buckets.get(key) ?? [];
    const matchedCount = Math.min(oldGroup.length, newGroup.length);

    for (let rowIndex = 0; rowIndex < matchedCount; rowIndex += 1) {
      const oldRow = oldGroup[rowIndex];
      const newRow = newGroup[rowIndex];
      const changes = getChangedFields(
        oldRow,
        newRow,
        compareColumns,
        caseSensitive,
      );
      rows.push(
        createDiffRow({
          id:
            changes.length > 0
              ? `modified-${index}-${rowIndex}`
              : `unchanged-${index}-${rowIndex}`,
          status: changes.length > 0 ? "modified" : "unchanged",
          columns,
          oldRow,
          newRow,
          changedFields: changes,
        }),
      );
    }

    oldGroup.slice(matchedCount).forEach((oldRow, rowIndex) => {
      rows.push(
        createDiffRow({
          id: `deleted-${index}-${rowIndex}`,
          status: "deleted",
          columns,
          oldRow,
        }),
      );
    });

    newGroup.slice(matchedCount).forEach((newRow, rowIndex) => {
      rows.push(
        createDiffRow({
          id: `added-${index}-${rowIndex}`,
          status: "added",
          columns,
          newRow,
        }),
      );
    });
  });

  return buildResult(rows, columns, duplicateKeyCount);
}

export function buildUnkeyedDiffResult({
  oldRows,
  oldColumns,
  newRows,
  newColumns,
  caseSensitive,
}: {
  oldRows: DataRow[];
  oldColumns: string[];
  newRows: DataRow[];
  newColumns: string[];
  caseSensitive: boolean;
}): DiffResult {
  if (oldRows.length === 0 && newRows.length === 0) return EMPTY_DIFF_RESULT;

  const columns = buildOutputColumns(oldColumns, newColumns);
  const compareColumns = buildComparableColumns(
    oldColumns,
    newColumns,
    columns,
  );
  const matchedPairs = matchRowsByContent(
    oldRows,
    newRows,
    compareColumns,
    caseSensitive,
  );
  const pairByOld = new Map(matchedPairs.map((pair) => [pair.oldIndex, pair]));
  const matchedOld = new Set(matchedPairs.map(({ oldIndex }) => oldIndex));
  const matchedNew = new Set(matchedPairs.map(({ newIndex }) => newIndex));
  const rows: DiffRow[] = [];

  oldRows.forEach((oldRow, oldIndex) => {
    const pair = pairByOld.get(oldIndex);
    if (pair) {
      const oldRow = oldRows[oldIndex];
      const newRow = newRows[pair.newIndex];
      const changes = getChangedFields(
        oldRow,
        newRow,
        compareColumns,
        caseSensitive,
      );
      rows.push(
        createDiffRow({
          id: `match-${oldIndex}-${pair.newIndex}`,
          status: changes.length > 0 ? "modified" : "unchanged",
          columns,
          oldRow,
          newRow,
          changedFields: changes,
        }),
      );
      return;
    }

    if (!matchedOld.has(oldIndex)) {
      rows.push(
        createDiffRow({
          id: `deleted-${oldIndex}`,
          status: "deleted",
          columns,
          oldRow,
        }),
      );
    }
  });

  newRows.forEach((newRow, newIndex) => {
    if (!matchedNew.has(newIndex)) {
      rows.push(
        createDiffRow({
          id: `added-${newIndex}`,
          status: "added",
          columns,
          newRow,
        }),
      );
    }
  });

  return buildResult(rows, columns, 0);
}

function buildOutputColumns(oldColumns: string[], newColumns: string[]) {
  return [
    "比对结果",
    "变更字段",
    ...oldColumns,
    ...newColumns.filter((column) => !oldColumns.includes(column)),
  ];
}

function buildComparableColumns(
  oldColumns: string[],
  newColumns: string[],
  outputColumns: string[],
) {
  const sharedColumns = oldColumns.filter((column) =>
    newColumns.includes(column),
  );
  return sharedColumns.length > 0 ? sharedColumns : outputColumns.slice(2);
}

function buildRowBuckets(
  rows: DataRow[],
  fields: string[],
  caseSensitive: boolean,
) {
  const buckets = new Map<string, DataRow[]>();
  let duplicateCount = 0;

  rows.forEach((row) => {
    const key = fields
      .map((f) => normalizeValue(row[f], caseSensitive))
      .join("||");
    if (!key || fields.every((f) => !normalizeValue(row[f], caseSensitive)))
      return;
    const bucket = buckets.get(key);
    if (bucket) {
      duplicateCount += 1;
      bucket.push(row);
      return;
    }
    buckets.set(key, [row]);
  });

  return { buckets, duplicateCount };
}

function createDiffRow({
  id,
  status,
  columns,
  oldRow,
  newRow,
  changedFields = [],
}: {
  id: string;
  status: DiffRowStatus;
  columns: string[];
  oldRow?: DataRow;
  newRow?: DataRow;
  changedFields?: string[];
}): DiffRow {
  const source = newRow ?? oldRow;
  const changeText = changedFields.join("；");

  return {
    id,
    diffStatus: status,
    changedFields,
    data: {
      比对结果: statusLabel(status),
      变更字段: changeText,
      ...Object.fromEntries(
        columns
          .slice(2)
          .map((column) => [column, source ? formatValue(source[column]) : ""]),
      ),
    },
  };
}

function getChangedFields(
  oldRow: DataRow,
  newRow: DataRow,
  columns: string[],
  caseSensitive: boolean,
) {
  return columns.flatMap((column) => {
    const oldValue = formatValue(oldRow[column]);
    const newValue = formatValue(newRow[column]);
    if (
      normalizeValue(oldValue, caseSensitive) ===
      normalizeValue(newValue, caseSensitive)
    )
      return [];
    return [`${column}: ${oldValue} → ${newValue}`];
  });
}

function buildResult(
  rows: DiffRow[],
  columns: string[],
  duplicateKeyCount: number,
): DiffResult {
  return {
    rows,
    columns,
    duplicateKeyCount,
    addedCount: rows.filter((row) => row.diffStatus === "added").length,
    deletedCount: rows.filter((row) => row.diffStatus === "deleted").length,
    modifiedCount: rows.filter((row) => row.diffStatus === "modified").length,
    unchangedCount: rows.filter((row) => row.diffStatus === "unchanged").length,
  };
}

function normalizeValue(value: unknown, caseSensitive: boolean) {
  const formatted = formatValue(value).trim();
  return caseSensitive ? formatted : formatted.toLowerCase();
}

function serializeRow(row: DataRow, columns: string[], caseSensitive: boolean) {
  return JSON.stringify(
    columns.map((column) => normalizeValue(row[column], caseSensitive)),
  );
}

function matchRowsByContent(
  oldRows: DataRow[],
  newRows: DataRow[],
  columns: string[],
  caseSensitive: boolean,
) {
  const matchedOld = new Set<number>();
  const matchedNew = new Set<number>();
  const pairs: Array<{ oldIndex: number; newIndex: number }> = [];
  const newBuckets = new Map<string, number[]>();

  newRows.forEach((row, index) => {
    const signature = serializeRow(row, columns, caseSensitive);
    const bucket = newBuckets.get(signature);
    if (bucket) {
      bucket.push(index);
      return;
    }
    newBuckets.set(signature, [index]);
  });

  oldRows.forEach((row, oldIndex) => {
    const signature = serializeRow(row, columns, caseSensitive);
    const bucket = newBuckets.get(signature);
    const newIndex = bucket?.find((candidate) => !matchedNew.has(candidate));
    if (newIndex === undefined) return;
    matchedOld.add(oldIndex);
    matchedNew.add(newIndex);
    pairs.push({ oldIndex, newIndex });
  });

  // 相似度 = 相等字段数 / 可比字段数，配对门槛 0.7。旧行有 n 个非空值时，
  // 候选新行至少要有 k = ceil(0.7n) 个值相等；按鸽巢原理，它必然命中旧行
  // 最稀有的 n-k+1 个值之一。只查这些值的倒排表，结果与逐行全量比较一致。
  const postings = new Map<string, number[]>();
  newRows.forEach((row, newIndex) => {
    if (matchedNew.has(newIndex)) return;
    columns.forEach((column) => {
      const value = normalizeValue(row[column], caseSensitive);
      if (!value) return;
      const key = `${column}\u0000${value}`;
      const list = postings.get(key);
      if (list) list.push(newIndex);
      else postings.set(key, [newIndex]);
    });
  });

  oldRows.forEach((oldRow, oldIndex) => {
    if (matchedOld.has(oldIndex)) return;

    const keys = columns.flatMap((column) => {
      const value = normalizeValue(oldRow[column], caseSensitive);
      return value ? [`${column}\u0000${value}`] : [];
    });
    if (keys.length === 0) return;

    const required = Math.ceil(keys.length * CONTENT_MATCH_THRESHOLD - 1e-9);
    const probeKeys = keys
      .map((key) => ({ key, size: postings.get(key)?.length ?? 0 }))
      .sort((a, b) => a.size - b.size)
      .slice(0, keys.length - required + 1);
    const candidates = new Set<number>();
    probeKeys.forEach(({ key }) => {
      postings.get(key)?.forEach((newIndex) => {
        if (!matchedNew.has(newIndex)) candidates.add(newIndex);
      });
    });

    let bestMatch: { newIndex: number; score: number } | null = null;
    Array.from(candidates)
      .sort((a, b) => a - b)
      .forEach((newIndex) => {
        const score = rowSimilarity(oldRow, newRows[newIndex], columns, caseSensitive);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { newIndex, score };
        }
      });

    const best = bestMatch as { newIndex: number; score: number } | null;
    if (best && best.score >= CONTENT_MATCH_THRESHOLD) {
      matchedOld.add(oldIndex);
      matchedNew.add(best.newIndex);
      pairs.push({ oldIndex, newIndex: best.newIndex });
    }
  });

  return pairs.sort(
    (a, b) => a.oldIndex - b.oldIndex || a.newIndex - b.newIndex,
  );
}

function rowSimilarity(
  oldRow: DataRow,
  newRow: DataRow,
  columns: string[],
  caseSensitive: boolean,
) {
  let comparableCount = 0;
  let equalCount = 0;

  columns.forEach((column) => {
    const oldValue = normalizeValue(oldRow[column], caseSensitive);
    const newValue = normalizeValue(newRow[column], caseSensitive);
    if (!oldValue && !newValue) return;

    comparableCount += 1;
    if (oldValue === newValue) {
      equalCount += 1;
    }
  });

  return comparableCount === 0 ? 0 : equalCount / comparableCount;
}

function statusLabel(status: DiffRowStatus) {
  if (status === "added") return "新增";
  if (status === "deleted") return "删除";
  if (status === "modified") return "修改";
  return "一致";
}
