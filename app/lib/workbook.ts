import * as XLSX from "xlsx";
import type { DataRow, OutputRow, WorkbookState } from "@/app/types";

export function normalizeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
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

export function parseWorkbook(file: File): Promise<WorkbookState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheets = workbook.SheetNames.reduce<Record<string, DataRow[]>>((acc, sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
            raw: false
          });

          acc[sheetName] = rows.map((row) =>
            Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), normalizeCell(value)]))
          );
          return acc;
        }, {});

        resolve({
          name: file.name,
          sheets,
          activeSheet: workbook.SheetNames[0] ?? ""
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function downloadExcel(filename: string, sheetName: string, columns: string[], rows: OutputRow[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.map((row) => row.data), { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
