import { describe, expect, it } from "vitest";
import type { WorkbookState } from "@/app/types";
import { buildMergeResult } from "@/app/lib/merge";
import { buildSearchResult } from "@/app/lib/search";

function book(name: string, sheets: WorkbookState["sheets"]): WorkbookState {
  const first = Object.keys(sheets)[0];
  return { name, sheets, raw: {}, headerRows: {}, activeSheet: first };
}

describe("buildMergeResult", () => {
  it("按字段名自动匹配 + 手动映射，合并全部 sheet 并整行去重", () => {
    const participant = book("b.xlsx", {
      s1: [{ 姓名: "张三", 手机: "1" }],
      s2: [{ 姓名: "张三", 手机: "1" }, { 姓名: "李四", 手机: "2" }],
    });
    const result = buildMergeResult({
      baseColumns: ["姓名", "电话"],
      baseRows: [{ 姓名: "王五", 电话: "3" }],
      baseSourceName: "a.xlsx",
      tables: [{ id: "merge-1", title: "参与表 A", workbook: participant, rows: [], columns: ["姓名", "手机"] }],
      fieldMapping: { 手机: "电话" },
      deduplicate: true,
    });
    expect(result.columns).toEqual(["姓名", "电话", "来源表名"]);
    expect(result.rows.map((row) => row.data["电话"])).toEqual(["3", "1", "2"]);
    expect(result.duplicateRowCount).toBe(1);
  });
});

describe("buildSearchResult", () => {
  const workbook = book("a.xlsx", {
    人员: [{ 姓名: "张三", 电话: "13800138000" }, { 姓名: "李四", 电话: "139" }],
    车辆: [{ 车牌: "京A12345", 车主: "ZHANG" }],
  });
  const tables = [
    { id: "search-1" as const, title: "检索表 A", workbook, selectedSheets: ["人员", "车辆"], selectedRowCount: 3 },
  ];

  it("包含检索，按命中 sheet 分块", () => {
    const result = buildSearchResult({ tables, query: "138", mode: "contains", caseSensitive: false });
    expect(result.sheets.map((sheet) => sheet.sheetName)).toEqual(["人员"]);
    expect(result.matchedRowCount).toBe(1);
  });

  it("精确检索与大小写", () => {
    expect(buildSearchResult({ tables, query: "zhang", mode: "exact", caseSensitive: false }).matchedRowCount).toBe(1);
    expect(buildSearchResult({ tables, query: "zhang", mode: "exact", caseSensitive: true }).matchedRowCount).toBe(0);
  });
});
