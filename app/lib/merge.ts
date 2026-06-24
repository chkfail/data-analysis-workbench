import type {
  DataRow,
  MergeFieldMapping,
  MergeTableRuntime,
  OutputRow,
} from "@/app/types";
import { normalizeKey } from "@/app/lib/workbook";

export type MergeOptions = {
  baseColumns: string[];
  baseRows: DataRow[];
  baseSourceName: string;
  tables: MergeTableRuntime[];
  fieldMapping: MergeFieldMapping;
  deduplicate: boolean;
};

export type MergeResult = {
  rows: OutputRow[];
  columns: string[];
  sourceRowCount: number;
  sourceTableCount: number;
  baseRowCount: number;
  unmatchedFields: string[];
  duplicateRowCount: number;
};

const SOURCE_COLUMN = "来源表名";

function buildColumnMapping(
  baseColumns: string[],
  sourceColumns: string[],
  fieldMapping: MergeFieldMapping,
): Map<string, string> {
  const normalizedBaseMap = new Map<string, string>();
  baseColumns.forEach((column) => {
    normalizedBaseMap.set(normalizeKey(column), column);
  });

  const mapping = new Map<string, string>();

  sourceColumns.forEach((sourceColumn) => {
    const manualTarget = fieldMapping[sourceColumn];
    if (manualTarget && baseColumns.includes(manualTarget)) {
      mapping.set(sourceColumn, manualTarget);
    }
  });

  sourceColumns.forEach((sourceColumn) => {
    if (mapping.has(sourceColumn)) return;

    const baseColumn = normalizedBaseMap.get(normalizeKey(sourceColumn));
    if (baseColumn) {
      mapping.set(sourceColumn, baseColumn);
    }
  });

  return mapping;
}

function collectUnmatchedFields(
  baseColumns: string[],
  sourceColumns: string[],
  fieldMapping: MergeFieldMapping,
): string[] {
  const normalizedBaseSet = new Set(baseColumns.map((column) => normalizeKey(column)));
  const manualSources = new Set(Object.keys(fieldMapping));

  return Array.from(
    new Set(
      sourceColumns.filter((sourceColumn) => {
        if (manualSources.has(sourceColumn)) return false;
        return !normalizedBaseSet.has(normalizeKey(sourceColumn));
      }),
    ),
  );
}

export function buildMergeResult({
  baseColumns,
  baseRows,
  baseSourceName,
  tables,
  fieldMapping,
  deduplicate,
}: MergeOptions): MergeResult {
  const outputColumns = baseColumns.length > 0 ? [...baseColumns, SOURCE_COLUMN] : [];
  const mergedRows: OutputRow[] = [];
  const unmatchedFieldSet = new Set<string>();
  let sourceRowCount = 0;
  let sourceTableCount = 0;

  baseRows.forEach((row, index) => {
    const outputData: Record<string, string> = {};
    baseColumns.forEach((column) => {
      outputData[column] = String(row[column] ?? "");
    });
    outputData[SOURCE_COLUMN] = baseSourceName;
    mergedRows.push({
      id: `base-${index}`,
      data: outputData,
    });
  });

  tables.forEach((table) => {
    if (!table.workbook) return;

    sourceTableCount += 1;
    const sourceName = table.workbook.name;

    Object.values(table.workbook.sheets).forEach((sheetRows) => {
      sourceRowCount += sheetRows.length;

      const mapping = buildColumnMapping(
        baseColumns,
        table.columns,
        fieldMapping,
      );

      collectUnmatchedFields(baseColumns, table.columns, fieldMapping).forEach(
        (field) => unmatchedFieldSet.add(field),
      );

      sheetRows.forEach((row, index) => {
        const outputData: Record<string, string> = {};

        table.columns.forEach((sourceColumn) => {
          const baseColumn = mapping.get(sourceColumn);
          if (!baseColumn) return;
          outputData[baseColumn] = String(row[sourceColumn] ?? "");
        });

        baseColumns.forEach((baseColumn) => {
          if (!(baseColumn in outputData)) {
            outputData[baseColumn] = "";
          }
        });

        outputData[SOURCE_COLUMN] = sourceName;

        mergedRows.push({
          id: `${table.id}-${index}-${mergedRows.length}`,
          data: outputData,
        });
      });
    });
  });

  let duplicateRowCount = 0;
  const dataColumns = baseColumns;

  if (deduplicate) {
    const uniqueRows: OutputRow[] = [];
    const seen = new Set<string>();

    mergedRows.forEach((row) => {
      const fingerprint = dataColumns
        .map((column) => `${column}:${row.data[column] ?? ""}`)
        .join("|");

      if (seen.has(fingerprint)) {
        duplicateRowCount += 1;
        return;
      }

      seen.add(fingerprint);
      uniqueRows.push(row);
    });

    return {
      rows: uniqueRows,
      columns: outputColumns,
      sourceRowCount,
      sourceTableCount,
      baseRowCount: baseRows.length,
      unmatchedFields: Array.from(unmatchedFieldSet),
      duplicateRowCount,
    };
  }

  return {
    rows: mergedRows,
    columns: outputColumns,
    sourceRowCount,
    sourceTableCount,
    baseRowCount: baseRows.length,
    unmatchedFields: Array.from(unmatchedFieldSet),
    duplicateRowCount: 0,
  };
}
