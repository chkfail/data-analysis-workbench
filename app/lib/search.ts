import * as XLSX from "xlsx";
import type { DataRow, OutputRow, SearchTableRuntime } from "@/app/types";
import { formatValue, getColumns } from "@/app/lib/workbook";

export type SearchMode = "exact" | "contains" | "fuzzy";

export type SearchSheetResult = {
  id: string;
  tableId: string;
  tableTitle: string;
  fileName: string;
  sheetName: string;
  columns: string[];
  rows: OutputRow[];
  sourceRowCount: number;
  hitFieldCount: number;
};

export type SearchExportSheet = {
  name: string;
  columns: string[];
  rows: DataRow[];
};

export type SearchResult = {
  rows: OutputRow[];
  columns: string[];
  sheets: SearchSheetResult[];
  exportSheets: SearchExportSheet[];
  matchedSheetCount: number;
  matchedRowCount: number;
  matchedFieldCount: number;
  sourceTableCount: number;
  sourceSheetCount: number;
  sourceRowCount: number;
};

export function buildSearchResult({
  tables,
  query,
  mode,
  caseSensitive,
}: {
  tables: SearchTableRuntime[];
  query: string;
  mode: SearchMode;
  caseSensitive: boolean;
}): SearchResult {
  const keyword = query.trim();
  const loadedTables = tables.filter((table) => table.workbook);
  const sourceSheetCount = loadedTables.reduce((sum, table) => sum + table.selectedSheets.length, 0);
  const sourceRowCount = loadedTables.reduce((sum, table) => sum + table.selectedRowCount, 0);

  if (!keyword || loadedTables.length === 0 || sourceSheetCount === 0) {
    return emptySearchResult({ loadedTables, sourceSheetCount, sourceRowCount });
  }

  const sheets: SearchSheetResult[] = [];
  const exportSheets: SearchExportSheet[] = [];
  let matchedRowCount = 0;
  let matchedFieldCount = 0;

  loadedTables.forEach((table) => {
    const workbook = table.workbook;
    if (!workbook) return;

    table.selectedSheets.forEach((sheetName) => {
      const sourceRows = workbook.sheets[sheetName] ?? [];
      const columns = getColumns(sourceRows);
      const hitRows = new Map<number, DataRow>();
      let sheetHitFieldCount = 0;

      sourceRows.forEach((row, rowIndex) => {
        columns.forEach((column) => {
          const value = formatValue(row[column]);
          if (!matchesSearch(value, keyword, mode, caseSensitive)) return;
          hitRows.set(rowIndex, row);
          sheetHitFieldCount += 1;
        });
      });

      if (hitRows.size === 0) return;

      const orderedRows = Array.from(hitRows.entries()).sort(([a], [b]) => a - b);
      const outputRows = orderedRows.map(([rowIndex, row]) => ({
        id: `${table.id}-${sheetName}-${rowIndex}`,
        data: Object.fromEntries(columns.map((column) => [column, formatValue(row[column])])),
      }));

      sheets.push({
        id: `${table.id}-${sheetName}`,
        tableId: table.id,
        tableTitle: table.title,
        fileName: workbook.name,
        sheetName,
        columns,
        rows: outputRows,
        sourceRowCount: sourceRows.length,
        hitFieldCount: sheetHitFieldCount,
      });
      exportSheets.push({
        name: sheetName,
        columns,
        rows: orderedRows.map(([, row]) => row),
      });
      matchedRowCount += hitRows.size;
      matchedFieldCount += sheetHitFieldCount;
    });
  });

  return {
    rows: sheets.flatMap((sheet) => sheet.rows),
    columns: [],
    sheets,
    exportSheets,
    matchedSheetCount: sheets.length,
    matchedRowCount,
    matchedFieldCount,
    sourceTableCount: loadedTables.length,
    sourceSheetCount,
    sourceRowCount,
  };
}

export function downloadSearchWorkbook(filename: string, sheets: SearchExportSheet[]) {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  sheets.forEach((sheet) => {
    const rows = sheet.rows.map((row) => sheet.columns.map((column) => formatValue(row[column])));
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheet.name, usedNames));
  });

  XLSX.writeFile(workbook, filename);
}

function emptySearchResult({
  loadedTables,
  sourceSheetCount,
  sourceRowCount,
}: {
  loadedTables: SearchTableRuntime[];
  sourceSheetCount: number;
  sourceRowCount: number;
}): SearchResult {
  return {
    rows: [],
    columns: [],
    sheets: [],
    exportSheets: [],
    matchedSheetCount: 0,
    matchedRowCount: 0,
    matchedFieldCount: 0,
    sourceTableCount: loadedTables.length,
    sourceSheetCount,
    sourceRowCount,
  };
}

export function cellMatchesSearch(value: string, query: string, mode: SearchMode, caseSensitive: boolean) {
  return matchesSearch(value, query, mode, caseSensitive);
}

function matchesSearch(value: string, query: string, mode: SearchMode, caseSensitive: boolean) {
  const normalizedValue = normalizeSearchText(value, caseSensitive);
  const normalizedQuery = normalizeSearchText(query, caseSensitive);
  if (!normalizedQuery || !normalizedValue) return false;

  if (mode === "exact") return normalizedValue === normalizedQuery;
  if (mode === "contains") return normalizedValue.includes(normalizedQuery);

  return normalizedValue.includes(normalizedQuery) || fuzzyScore(normalizedValue, normalizedQuery) >= 0.72;
}

function normalizeSearchText(value: string, caseSensitive: boolean) {
  const trimmed = value.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

function fuzzyScore(value: string, query: string) {
  if (value === query) return 1;
  if (query.length <= 1 || value.length <= 1) return 0;

  if (value.length <= query.length) {
    return bigramSimilarity(value, query);
  }

  let best = 0;
  const minWindow = Math.max(2, query.length - 2);
  const maxWindow = Math.min(value.length, query.length + 2);

  for (let size = minWindow; size <= maxWindow; size += 1) {
    for (let start = 0; start <= value.length - size; start += 1) {
      best = Math.max(best, bigramSimilarity(value.slice(start, start + size), query));
      if (best >= 0.72) return best;
    }
  }

  return best;
}

function bigramSimilarity(a: string, b: string) {
  const aSet = bigrams(a);
  const bSet = bigrams(b);
  const union = new Set([...Array.from(aSet), ...Array.from(bSet)]);
  if (union.size === 0) return 1;
  const intersection = Array.from(aSet).filter((item) => bSet.has(item));
  return intersection.length / union.size;
}

function bigrams(value: string) {
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
}

function safeSheetName(rawName: string, usedNames: Set<string>) {
  const base = (rawName || "命中表").replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "命中表";
  let name = base;
  let index = 2;

  while (usedNames.has(name)) {
    const suffix = `_${index}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }

  usedNames.add(name);
  return name;
}
