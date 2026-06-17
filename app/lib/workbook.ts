import ExcelJS from "exceljs";
import type { DataRow, OutputRow, WorkbookState } from "@/app/types";

export function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const formulaResult = (value as { result?: unknown }).result;
    if (formulaResult !== undefined) return normalizeCell(formulaResult);
    const richText = (value as { richText?: Array<{ text?: string }> }).richText;
    if (Array.isArray(richText)) {
      return richText.map((item) => item.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

export function normalizeKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function getColumns(rows: DataRow[]) {
  return Array.from(
    rows.reduce<Set<string>>((columns, row) => {
      Object.keys(row).forEach((key) => columns.add(key));
      return columns;
    }, new Set())
  );
}

export function toTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    if (value > 25569 && value < 60000) return (value - 25569) * 86400 * 1000;
    return value;
  }

  const parsed = Date.parse(String(value).trim());
  return Number.isNaN(parsed) ? null : parsed;
}

function isXlsxFile(file: File) {
  return file.name.toLowerCase().endsWith(".xlsx");
}

function isCsvFile(file: File) {
  return file.name.toLowerCase().endsWith(".csv");
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function buildDataRows(worksheet: ExcelJS.Worksheet): DataRow[] {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: DataRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const dataRow: DataRow = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        dataRow[header] = normalizeCell(cell.value);
      }
    });
    rows.push(dataRow);
  });

  return rows;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r") {
      if (nextChar === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function buildDataRowsFromCsv(rows: string[][]): DataRow[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => {
    const row: DataRow = {};
    values.forEach((value, index) => {
      const header = headers[index];
      if (header) {
        row[header] = normalizeCell(value);
      }
    });
    return row;
  });
}

export async function parseWorkbook(file: File): Promise<WorkbookState> {
  if (isCsvFile(file)) {
    const text = await readFileAsText(file);
    const sheetName = "Sheet1";
    const rows = buildDataRowsFromCsv(parseCsvRows(text));

    return {
      name: file.name,
      sheets: { [sheetName]: rows },
      activeSheet: sheetName,
    };
  }

  if (isXlsxFile(file)) {
    const buffer = await readFileAsArrayBuffer(file);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheets: Record<string, DataRow[]> = {};
    workbook.worksheets.forEach((worksheet) => {
      sheets[worksheet.name] = buildDataRows(worksheet);
    });

    const sheetNames = Object.keys(sheets);
    return {
      name: file.name,
      sheets,
      activeSheet: sheetNames[0] ?? "",
    };
  }

  throw new Error("Unsupported file type");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadExcel(
  filename: string,
  sheetName: string,
  columns: string[],
  rows: OutputRow[],
  columnLabel?: (column: string) => string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(safeSheetName(sheetName));
  const exportColumns = columns.map((column) => (columnLabel ? columnLabel(column) : column));

  worksheet.addRow(exportColumns);
  rows.forEach((row) => {
    worksheet.addRow(columns.map((column) => row.data[column] ?? ""));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

export function safeSheetName(rawName: string) {
  const base = (rawName || "Sheet").replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet";
  return base;
}
