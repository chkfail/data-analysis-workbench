import type { DataRow, OutputRow } from "@/app/types";
import { formatValue, toTimestamp } from "@/app/lib/workbook";

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
}) {
  if (!baseField || !timeField || rows.length === 0) {
    return { rows: [] as OutputRow[], columns: [] as string[], groups: 0, ignored: 0 };
  }

  const latestByKey = new Map<string, { index: number; row: DataRow; timestamp: number | null }>();
  let ignored = 0;

  rows.forEach((row, index) => {
    const key = formatValue(row[baseField]).trim();
    if (!key) {
      ignored += 1;
      return;
    }

    const timestamp = toTimestamp(row[timeField]);
    const current = latestByKey.get(key);
    const currentScore = current?.timestamp ?? Number.NEGATIVE_INFINITY;
    const nextScore = timestamp ?? Number.NEGATIVE_INFINITY;

    if (!current || nextScore > currentScore || (nextScore === currentScore && index > current.index)) {
      latestByKey.set(key, { index, row, timestamp });
    }
  });

  const resultRows = Array.from(latestByKey.values())
    .sort((a, b) => (b.timestamp ?? Number.NEGATIVE_INFINITY) - (a.timestamp ?? Number.NEGATIVE_INFINITY))
    .map<OutputRow>((item) => ({
      id: `latest-${item.index}`,
      data: Object.fromEntries(columns.map((column) => [column, formatValue(item.row[column])]))
    }));

  return { rows: resultRows, columns, groups: resultRows.length, ignored };
}
