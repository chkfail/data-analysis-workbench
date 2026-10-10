import type { DataRow, OutputRow } from "@/app/types";
import { formatValue, toTimestamp } from "@/app/lib/workbook";

export type LatestResult = {
  rows: OutputRow[];
  columns: string[];
  groups: number;
  ignored: number;
  /** 时间字段非空但无法识别的行数，这些行按最旧处理 */
  unparsedTime: number;
};

export const EMPTY_LATEST_RESULT: LatestResult = { rows: [], columns: [], groups: 0, ignored: 0, unparsedTime: 0 };

export function buildLatestResult({
  rows,
  columns,
  baseField,
  timeField
}: {
  rows: DataRow[];
  columns: string[];
  baseField: string;
  timeField: string;
}): LatestResult {
  if (!baseField || !timeField || rows.length === 0) {
    return EMPTY_LATEST_RESULT;
  }

  const latestByKey = new Map<string, { index: number; row: DataRow; timestamp: number | null }>();
  let ignored = 0;
  let unparsedTime = 0;

  rows.forEach((row, index) => {
    const key = formatValue(row[baseField]).trim();
    if (!key) {
      ignored += 1;
      return;
    }

    const timestamp = toTimestamp(row[timeField]);
    if (timestamp === null && formatValue(row[timeField]).trim()) unparsedTime += 1;
    const current = latestByKey.get(key);
    const currentScore = current?.timestamp ?? Number.NEGATIVE_INFINITY;
    const nextScore = timestamp ?? Number.NEGATIVE_INFINITY;

    if (!current || nextScore > currentScore || (nextScore === currentScore && index > current.index)) {
      latestByKey.set(key, { index, row, timestamp });
    }
  });

  const resultRows = Array.from(latestByKey.values())
    .sort((a, b) => {
      const left = a.timestamp ?? Number.NEGATIVE_INFINITY;
      const right = b.timestamp ?? Number.NEGATIVE_INFINITY;
      return left === right ? 0 : right > left ? 1 : -1;
    })
    .map<OutputRow>((item) => ({
      id: `latest-${item.index}`,
      data: Object.fromEntries(columns.map((column) => [column, formatValue(item.row[column])]))
    }));

  return { rows: resultRows, columns, groups: resultRows.length, ignored, unparsedTime };
}
