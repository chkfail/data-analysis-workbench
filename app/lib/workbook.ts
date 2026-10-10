import ExcelJS from "exceljs";
import type { CellValue, DataRow, OutputRow, WorkbookState } from "@/app/types";

export const ACCEPTED_FILE_TYPES = ".xlsx,.csv";

export class UnsupportedFileError extends Error {}

export function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return formatDateCell(value);
  if (typeof value === "object") {
    const formulaResult = (value as { result?: unknown }).result;
    if (formulaResult !== undefined) return normalizeCell(formulaResult);
    const richText = (value as { richText?: Array<{ text?: string }> }).richText;
    if (Array.isArray(richText)) {
      return richText.map((item) => item.text ?? "").join("").trim();
    }
    const text = (value as { text?: unknown }).text;
    if (text !== undefined) return normalizeCell(text);
    const error = (value as { error?: unknown }).error;
    if (typeof error === "string") return error;
    if ((value as { formula?: unknown }).formula !== undefined) return "";
  }
  return String(value).trim();
}

/**
 * exceljs 把单元格日期按 UTC 存成 Date（墙上时间），这里也按 UTC 分量格式化，
 * 避免受运行机器时区影响。
 */
function formatDateCell(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  if (hours === 0 && minutes === 0 && seconds === 0) return day;
  return `${day} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    if (!header) return header;
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    if (count === 0) return header;
    return `${header} (${count + 1})`;
  });
}

/* ------------------------------------------------------------------ */
/*  时间解析                                                           */
/* ------------------------------------------------------------------ */

const EXCEL_EPOCH_OFFSET = 25569;
const DAY_MS = 86400 * 1000;

function utcTimestamp(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0, ms = 0) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  const timestamp = Date.UTC(year, month - 1, day, hours, minutes, seconds, ms);
  const date = new Date(timestamp);
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return timestamp;
}

function parseCompactDigits(digits: string) {
  // 20240102 / 202401021030 / 20240102103000
  if (![8, 12, 14].includes(digits.length)) return null;
  const year = Number(digits.slice(0, 4));
  if (year < 1900 || year > 2999) return null;
  return utcTimestamp(
    year,
    Number(digits.slice(4, 6)),
    Number(digits.slice(6, 8)),
    Number(digits.slice(8, 10) || 0),
    Number(digits.slice(10, 12) || 0),
    Number(digits.slice(12, 14) || 0),
  );
}

function numberToTimestamp(value: number) {
  if (!Number.isFinite(value)) return null;
  if (Number.isInteger(value)) {
    const compact = parseCompactDigits(String(value));
    if (compact !== null) return compact;
  }
  // Excel 序列日期（1970-01-01 ~ 2064-04-09）
  if (value > EXCEL_EPOCH_OFFSET && value < 60000) {
    return Math.round((value - EXCEL_EPOCH_OFFSET) * DAY_MS);
  }
  return value;
}

const DATE_PATTERN =
  /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2})(?:\.(\d{1,3})\d*)?)?)?$/;

/**
 * 把单元格值转成可排序的时间戳；无法识别时返回 null。
 * 支持 Excel 序列日期、2024-01-02 / 2024/1/2 / 2024.1.2（可带时分秒）、
 * 2024年1月2日 10时5分、20240102(103000) 等常见格式，其余交给 Date.parse。
 * 无时区的格式统一按墙上时间（UTC）计算，保证同一列内可比较。
 */
export function toTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return numberToTimestamp(value);
  if (typeof value === "boolean") return null;

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) return numberToTimestamp(Number(text));

  const normalized = text
    .replace(/[年月]/g, "-")
    .replace(/日|号/g, " ")
    .replace(/[时点]/g, ":")
    .replace(/分/g, ":")
    .replace(/秒/g, "")
    .replace(/:(?=\s*$)/, "")
    .replace(/-(?=\s*$)/, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = normalized.match(DATE_PATTERN);
  if (match) {
    return utcTimestamp(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
      Number((match[7] ?? "0").padEnd(3, "0")),
    );
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : parsed;
}

/* ------------------------------------------------------------------ */
/*  解析：xlsx / csv → 原始二维数组 → 按表头行生成数据行                 */
/* ------------------------------------------------------------------ */

function getExtension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

/**
 * 先按 UTF-8 严格解码，失败再按 GB18030（GBK 超集）解码。
 * 国内 Excel 另存的 CSV 多为 GBK，直接按 UTF-8 读会乱码。
 */
export function decodeText(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("gb18030").decode(bytes);
  }
}

export function detectDelimiter(text: string) {
  const firstLine = text.slice(0, 4096).split(/\r?\n/)[0] ?? "";
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = 0;
  candidates.forEach((candidate) => {
    let count = 0;
    let inQuotes = false;
    for (const char of firstLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes && char === candidate) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  });
  return best;
}

export function parseCsvRows(text: string, delimiter = ","): string[][] {
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
    } else if (char === delimiter) {
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

function isEmptyCell(value: CellValue | undefined) {
  return value === null || value === undefined || value === "";
}

function isEmptyRow(row: CellValue[] | undefined) {
  return !row || row.every((value) => isEmptyCell(value));
}

function distinctValueCount(row: CellValue[] | undefined) {
  if (!row) return 0;
  return new Set(row.filter((value) => !isEmptyCell(value)).map((value) => String(value).trim())).size;
}

/**
 * 自动识别表头行（1 起计，对应 Excel 行号）。
 * 只跳过开头的"标题行/制表信息行"：不同值不超过 2 个、且少于前 20 行里最宽一行的列数。
 * 合并单元格的标题在 exceljs 里会把同一个值铺满整行，按不同值计数可以识别出来。
 */
export function detectHeaderRow(matrix: CellValue[][]) {
  const scanLimit = Math.min(matrix.length, 20);
  let maxDistinct = 0;
  for (let index = 0; index < scanLimit; index += 1) {
    maxDistinct = Math.max(maxDistinct, distinctValueCount(matrix[index]));
  }

  for (let index = 0; index < scanLimit; index += 1) {
    if (isEmptyRow(matrix[index])) continue;
    const distinct = distinctValueCount(matrix[index]);
    if (distinct > 2 || distinct >= maxDistinct) return index + 1;
  }

  const firstNonEmpty = matrix.findIndex((row) => !isEmptyRow(row));
  return firstNonEmpty >= 0 ? firstNonEmpty + 1 : 1;
}

export function buildRowsFromMatrix(matrix: CellValue[][], headerRow: number): DataRow[] {
  const headerIndex = Math.max(headerRow - 1, 0);
  const headerCells = matrix[headerIndex] ?? [];
  const headers = uniqueHeaders(
    Array.from({ length: headerCells.length }, (_, index) => formatValue(headerCells[index]).trim()),
  );

  const rows: DataRow[] = [];
  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const values = matrix[index];
    if (isEmptyRow(values)) continue;

    const row: DataRow = {};
    headers.forEach((header, columnIndex) => {
      if (!header) return;
      row[header] = values[columnIndex] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function worksheetToMatrix(worksheet: ExcelJS.Worksheet): CellValue[][] {
  const matrix: CellValue[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values: CellValue[] = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      values[colNumber - 1] = normalizeCell(cell.value);
    });
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === undefined) values[index] = "";
    }
    matrix[rowNumber - 1] = values;
  });
  for (let index = 0; index < matrix.length; index += 1) {
    if (!matrix[index]) matrix[index] = [];
  }
  return matrix;
}

function csvToMatrix(text: string): CellValue[][] {
  return parseCsvRows(text, detectDelimiter(text)).map((values) => values.map((value) => normalizeCell(value)));
}

export function createWorkbookState(name: string, matrices: Record<string, CellValue[][]>): WorkbookState {
  const sheets: Record<string, DataRow[]> = {};
  const headerRows: Record<string, number> = {};
  Object.entries(matrices).forEach(([sheetName, matrix]) => {
    headerRows[sheetName] = detectHeaderRow(matrix);
    sheets[sheetName] = buildRowsFromMatrix(matrix, headerRows[sheetName]);
  });

  return {
    name,
    sheets,
    raw: matrices,
    headerRows,
    activeSheet: Object.keys(matrices)[0] ?? "",
  };
}

/** 修改指定工作表（缺省为全部工作表）的表头行，返回新的 workbook。 */
export function applyHeaderRow(workbook: WorkbookState, headerRow: number, sheetNames?: string[]): WorkbookState {
  const targets = sheetNames ?? Object.keys(workbook.raw);
  const sheets = { ...workbook.sheets };
  const headerRows = { ...workbook.headerRows };

  targets.forEach((sheetName) => {
    const matrix = workbook.raw[sheetName];
    if (!matrix) return;
    const clamped = Math.min(Math.max(Math.floor(headerRow) || 1, 1), Math.max(matrix.length, 1));
    headerRows[sheetName] = clamped;
    sheets[sheetName] = buildRowsFromMatrix(matrix, clamped);
  });

  return { ...workbook, sheets, headerRows };
}

export function getSheetRowLimit(workbook: WorkbookState, sheetName: string) {
  return Math.max(workbook.raw[sheetName]?.length ?? 1, 1);
}

export async function parseWorkbook(file: File): Promise<WorkbookState> {
  const extension = getExtension(file.name);

  if (extension === "csv") {
    const text = decodeText(await file.arrayBuffer());
    return createWorkbookState(file.name, { Sheet1: csvToMatrix(text) });
  }

  if (extension === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());

    const matrices: Record<string, CellValue[][]> = {};
    workbook.worksheets.forEach((worksheet) => {
      matrices[worksheet.name] = worksheetToMatrix(worksheet);
    });
    return createWorkbookState(file.name, matrices);
  }

  if (extension === "xls") {
    throw new UnsupportedFileError("暂不支持 .xls，请在 Excel 中另存为 .xlsx 后再导入。");
  }

  throw new UnsupportedFileError("文件格式不支持，请导入 .xlsx / .csv 文件。");
}

export function describeParseError(error: unknown) {
  if (error instanceof UnsupportedFileError) return error.message;
  return "文件解析失败，请检查文件是否损坏或被加密。";
}

/* ------------------------------------------------------------------ */
/*  导出                                                               */
/* ------------------------------------------------------------------ */

const PLAIN_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const EXPORT_DATE = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/;

export type ExcelCell = { value: string | number | Date; numFmt?: string };

/**
 * 结果统一以字符串流转，导出时还原类型：
 * - 普通数字写成数字，Excel 可直接求和；
 * - 11 位及以上整数（手机号、身份证、银行卡）和超过 15 位有效数字的值保留文本，避免科学计数法和精度丢失；
 * - 2024-01-02 / 2024-01-02 10:00:00 写成 Excel 日期。
 */
export function toExcelCell(value: unknown): ExcelCell {
  if (typeof value === "number" && Number.isFinite(value)) {
    return toExcelCell(String(value));
  }

  const text = formatValue(value);
  if (PLAIN_NUMBER.test(text)) {
    const [integerPart, decimalPart = ""] = text.replace("-", "").split(".");
    const isLongInteger = !decimalPart && integerPart.length >= 11;
    const significantDigits = (integerPart.replace(/^0+/, "") + decimalPart).length;
    if (!isLongInteger && significantDigits <= 15) return { value: Number(text) };
    return { value: text };
  }

  const dateMatch = text.match(EXPORT_DATE);
  if (dateMatch) {
    const [, year, month, day, hours, minutes, seconds] = dateMatch;
    const timestamp = utcTimestamp(
      Number(year),
      Number(month),
      Number(day),
      Number(hours ?? 0),
      Number(minutes ?? 0),
      Number(seconds ?? 0),
    );
    if (timestamp !== null) {
      return {
        value: new Date(timestamp),
        numFmt: hours === undefined ? "yyyy-mm-dd" : "yyyy-mm-dd hh:mm:ss",
      };
    }
  }

  return { value: text };
}

export function writeWorksheet(worksheet: ExcelJS.Worksheet, headers: string[], rows: unknown[][]) {
  worksheet.addRow(headers);
  rows.forEach((values) => {
    const cells = values.map((value) => toExcelCell(value));
    const row = worksheet.addRow(cells.map((cell) => cell.value));
    cells.forEach((cell, index) => {
      if (cell.numFmt) row.getCell(index + 1).numFmt = cell.numFmt;
    });
  });
}

export async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
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

  writeWorksheet(
    worksheet,
    exportColumns,
    rows.map((row) => columns.map((column) => row.data[column] ?? "")),
  );
  await saveWorkbook(workbook, filename);
}

export function safeSheetName(rawName: string) {
  const base = (rawName || "Sheet").replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet";
  return base;
}
