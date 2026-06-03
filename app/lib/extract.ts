import type { DataRow, OutputRow } from "@/app/types";
import { formatValue } from "@/app/lib/workbook";

export type ExtractTemplateId = "mobile" | "id-card" | "bank-card" | "email" | "tenpay" | "alipay" | "custom";

export const EXTRACT_TEMPLATES: Record<
  Exclude<ExtractTemplateId, "custom">,
  {
    title: string;
    outputColumn: string;
    pattern: string;
  }
> = {
  mobile: {
    title: "手机号",
    outputColumn: "提取手机号",
    pattern: "(?<!\\d)(1[3-9]\\d{9})(?!\\d)"
  },
  "id-card": {
    title: "身份证号",
    outputColumn: "提取身份证号",
    pattern: "(?<!\\d)\\d{17}[\\dXx](?!\\d)"
  },
  "bank-card": {
    title: "银行卡号",
    outputColumn: "提取银行卡号",
    pattern: "(?<!\\d)(?:\\d[ -]?){13,19}(?!\\d)"
  },
  email: {
    title: "邮箱",
    outputColumn: "提取邮箱",
    pattern: "([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})"
  },
  tenpay: {
    title: "财付通",
    outputColumn: "提取财付通",
    pattern: "([A-Fa-f0-9]+@wx\\.tenpay\\.com)"
  },
  alipay: {
    title: "支付宝",
    outputColumn: "提取支付宝",
    pattern: "(?<!\\d)(2088\\d{16})(?!\\d)"
  }
};

export function buildExtractResult({
  rows,
  columns,
  sourceFields,
  templates,
  customPattern
}: {
  rows: DataRow[];
  columns: string[];
  sourceFields: string[];
  templates: ExtractTemplateId[];
  customPattern: string;
}) {
  if (rows.length === 0 || columns.length === 0 || sourceFields.length === 0) {
    return { rows: [] as OutputRow[], columns: [] as string[], extracted: 0, extractedByColumn: {} as Record<string, number>, error: "" };
  }

  if (templates.length === 0) {
    return { rows: [] as OutputRow[], columns: [] as string[], extracted: 0, extractedByColumn: {} as Record<string, number>, error: "请选择提取模板。" };
  }

  const configs = templates.map((template) => getExtractConfig(template, customPattern));
  const error = configs.find((config) => config.error)?.error;
  if (error) {
    return { rows: [] as OutputRow[], columns: [] as string[], extracted: 0, extractedByColumn: {} as Record<string, number>, error };
  }

  const rowMatches = rows.map((row) => {
    return configs.map((config) => sourceFields.flatMap((field) => readAllMatches(formatValue(row[field]), config)));
  });
  const outputColumnsByConfig = configs.map((config, configIndex) => {
    const maxMatchCount = Math.max(...rowMatches.map((matches) => matches[configIndex].length), 0);
    return buildNumberedColumns(config.outputColumn, maxMatchCount);
  });
  const outputColumns = outputColumnsByConfig.flat();
  const resultColumns = [...columns, ...outputColumns];
  const extractedByColumn = Object.fromEntries(configs.map((config) => [config.outputColumn, 0]));
  let extracted = 0;

  const resultRows = rows.map<OutputRow>((row, index) => {
    const extractedValues = Object.fromEntries(outputColumns.map((column) => [column, ""]));
    let rowExtracted = false;

    configs.forEach((config, configIndex) => {
      const matches = rowMatches[index][configIndex];
      const configColumns = outputColumnsByConfig[configIndex];
      if (matches.length === 0) return;

      configColumns.forEach((column, valueIndex) => {
        const value = matches[valueIndex] ?? "";
        extractedValues[column] = value;
      });
      extractedByColumn[config.outputColumn] += 1;
      rowExtracted = true;
    });

    if (rowExtracted) extracted += 1;

    return {
      id: String(index),
      data: {
        ...Object.fromEntries(columns.map((column) => [column, formatValue(row[column])])),
        ...extractedValues
      }
    };
  });

  return { rows: resultRows, columns: resultColumns, extracted, extractedByColumn, error: "" };
}

function getExtractConfig(template: ExtractTemplateId, customPattern: string) {
  if (template !== "custom") {
    const preset = EXTRACT_TEMPLATES[template];
    return {
      regex: new RegExp(preset.pattern, "g"),
      outputColumn: preset.outputColumn,
      validate:
        template === "id-card"
          ? isValidIdCard
          : template === "bank-card"
            ? isValidBankCard
            : template === "email"
              ? (value: string) => !/@wx\.tenpay\.com$/i.test(value)
              : undefined,
      error: ""
    };
  }

  const parsed = parseCustomPattern(customPattern);
  if (parsed.error || !parsed.pattern) {
    return {
      regex: /$a/,
      outputColumn: "提取结果",
      error: parsed.error || "请输入自定义正则。"
    };
  }

  try {
    const regex = new RegExp(parsed.pattern, parsed.flags.includes("g") ? parsed.flags : `${parsed.flags}g`);
    const outputColumns = getNamedGroups(parsed.pattern);
    return {
      regex,
      outputColumn: outputColumns[0] ?? "提取结果",
      error: ""
    };
  } catch {
    return {
      regex: /$a/,
      outputColumn: "提取结果",
      error: "自定义正则无效，请检查表达式。"
    };
  }
}

function parseCustomPattern(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return { pattern: "", flags: "", error: "" };

  const literalMatch = trimmed.match(/^\/(.+)\/([dgimsuvy]*)$/);
  if (!literalMatch) return { pattern: trimmed, flags: "", error: "" };

  return {
    pattern: literalMatch[1],
    flags: literalMatch[2].replace(/[gy]/g, ""),
    error: ""
  };
}

function getNamedGroups(pattern: string) {
  return Array.from(pattern.matchAll(/\(\?<([A-Za-z_$][\w$]*)>/g), (match) => match[1]);
}

function buildNumberedColumns(column: string, count: number) {
  if (count <= 0) return [column];
  if (count === 1) return [column];
  return Array.from({ length: count }, (_, index) => `${column}${index + 1}`);
}

function readAllMatches(value: string, config: { regex: RegExp; outputColumn: string; validate?: (value: string) => boolean }) {
  const matches: string[] = [];
  config.regex.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = config.regex.exec(value))) {
    const captured = match.groups?.[config.outputColumn] ?? match[1] ?? match[0];
    const formatted = formatValue(captured);
    if (formatted && (config.validate ? config.validate(formatted) : true)) matches.push(formatted);
    if (match[0] === "") config.regex.lastIndex += 1;
  }

  return matches;
}

function isValidIdCard(value: string) {
  const id = value.trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(id)) return false;

  const birth = id.slice(6, 14);
  if (!isValidDateCode(birth)) return false;

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const sum = weights.reduce((total, weight, index) => total + Number(id[index]) * weight, 0);
  return checkCodes[sum % 11] === id[17];
}

function isValidDateCode(value: string) {
  if (!/^\d{8}$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (year < 1900 || year > new Date().getFullYear()) return false;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidBankCard(value: string) {
  const card = value.replace(/[\s-]/g, "");
  if (!/^\d{13,19}$/.test(card)) return false;
  if (/^2088\d{16}$/.test(card)) return false;
  if (isValidIdCard(card)) return false;
  return passesLuhn(card);
}

function passesLuhn(value: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
