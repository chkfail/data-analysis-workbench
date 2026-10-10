import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  applyHeaderRow,
  decodeText,
  detectDelimiter,
  detectHeaderRow,
  normalizeCell,
  parseWorkbook,
  toExcelCell,
  toTimestamp,
} from "@/app/lib/workbook";

function gbkBytes() {
  // "姓名,电话\n张三,13800138000" 的 GBK 编码
  return new Uint8Array([
    0xd0, 0xd5, 0xc3, 0xfb, 0x2c, 0xb5, 0xe7, 0xbb, 0xb0, 0x0a, 0xd5, 0xc5, 0xc8, 0xfd, 0x2c,
    ...Array.from("13800138000", (char) => char.charCodeAt(0)),
  ]);
}

describe("decodeText", () => {
  it("UTF-8（含 BOM）直接解码", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...Array.from(new TextEncoder().encode("姓名"))]);
    expect(decodeText(bytes)).toBe("姓名");
  });

  it("非法 UTF-8 回退到 GBK", () => {
    expect(decodeText(gbkBytes())).toBe("姓名,电话\n张三,13800138000");
  });
});

describe("detectDelimiter", () => {
  it("识别逗号、制表符、分号", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter("a;b;c")).toBe(";");
  });

  it("忽略引号内的分隔符", () => {
    expect(detectDelimiter('"a,b,c";d;e')).toBe(";");
  });
});

describe("detectHeaderRow", () => {
  it("普通表第 1 行是表头", () => {
    expect(detectHeaderRow([["姓名", "电话"], ["张三", "1"]])).toBe(1);
  });

  it("跳过合并单元格标题和制表信息行", () => {
    const title = ["2024 年人员名单", "2024 年人员名单", "2024 年人员名单", "2024 年人员名单"];
    const meta = ["制表人", "李四"];
    const header = ["姓名", "电话", "地址", "备注"];
    expect(detectHeaderRow([title, meta, [], header, ["张三", "1", "北京", ""]])).toBe(4);
  });

  it("两列表不会误跳表头", () => {
    expect(detectHeaderRow([["姓名", "电话"], ["张三", "1"], ["李四", "2"]])).toBe(1);
  });
});

describe("applyHeaderRow", () => {
  it("切换表头行后重建字段", async () => {
    const file = new File(["标题\n姓名,电话\n张三,1"], "a.csv");
    const workbook = await parseWorkbook(file);
    expect(workbook.headerRows.Sheet1).toBe(2);
    expect(workbook.sheets.Sheet1).toEqual([{ 姓名: "张三", 电话: "1" }]);

    const changed = applyHeaderRow(workbook, 1);
    expect(changed.headerRows.Sheet1).toBe(1);
    expect(changed.sheets.Sheet1).toEqual([{ 标题: "姓名" }, { 标题: "张三" }]);
  });
});

describe("parseWorkbook", () => {
  it("GBK 编码的 CSV 不乱码", async () => {
    const workbook = await parseWorkbook(new File([gbkBytes()], "gbk.csv"));
    expect(workbook.sheets.Sheet1).toEqual([{ 姓名: "张三", 电话: "13800138000" }]);
  });

  it("保留表头列顺序，空单元格补空字符串", async () => {
    const workbook = await parseWorkbook(new File(["a,b,c\n1,,3\n,,\n4,5,6"], "x.csv"));
    expect(workbook.sheets.Sheet1).toEqual([
      { a: "1", b: "", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("xlsx 的日期按本地格式读取，多 sheet 都解析", async () => {
    const source = new ExcelJS.Workbook();
    const first = source.addWorksheet("人员");
    first.addRow(["姓名", "日期", "时间"]);
    first.addRow(["张三", new Date(Date.UTC(2024, 0, 2)), new Date(Date.UTC(2024, 0, 2, 10, 5, 0))]);
    source.addWorksheet("空表");
    const buffer = await source.xlsx.writeBuffer();

    const workbook = await parseWorkbook(new File([buffer], "a.xlsx"));
    expect(Object.keys(workbook.sheets)).toEqual(["人员", "空表"]);
    expect(workbook.sheets["人员"]).toEqual([{ 姓名: "张三", 日期: "2024-01-02", 时间: "2024-01-02 10:05:00" }]);
  });

  it(".xls 给出明确提示", async () => {
    await expect(parseWorkbook(new File(["x"], "old.xls"))).rejects.toThrow("另存为 .xlsx");
  });
});

describe("normalizeCell", () => {
  it("超链接、公式、错误值", () => {
    expect(normalizeCell({ text: "百度", hyperlink: "http://x" })).toBe("百度");
    expect(normalizeCell({ formula: "A1+1", result: 3 })).toBe(3);
    expect(normalizeCell({ error: "#N/A" })).toBe("#N/A");
  });
});

describe("toTimestamp", () => {
  const day = Date.UTC(2024, 0, 2);
  const withTime = Date.UTC(2024, 0, 2, 10, 5, 0);

  it.each([
    ["2024-01-02", day],
    ["2024/1/2", day],
    ["2024.1.2", day],
    ["2024年1月2日", day],
    ["20240102", day],
    [20240102, day],
    ["2024-01-02 10:05", withTime],
    ["2024/1/2 10:05:00", withTime],
    ["2024年1月2日 10时5分", withTime],
    ["2024年1月2日10点05分00秒", withTime],
    ["20240102100500", withTime],
    [45293, day],
  ])("%s", (value, expected) => {
    expect(toTimestamp(value)).toBe(expected);
  });

  it("非法日期返回 null", () => {
    expect(toTimestamp("2024-02-30")).toBeNull();
    expect(toTimestamp("昨天")).toBeNull();
    expect(toTimestamp("")).toBeNull();
  });
});

describe("toExcelCell", () => {
  it("普通数字写成数字", () => {
    expect(toExcelCell("123")).toEqual({ value: 123 });
    expect(toExcelCell("-12.5")).toEqual({ value: -12.5 });
    expect(toExcelCell(42)).toEqual({ value: 42 });
  });

  it("长数字、前导零保留文本", () => {
    expect(toExcelCell("13800138000")).toEqual({ value: "13800138000" });
    expect(toExcelCell("11010519491231002X")).toEqual({ value: "11010519491231002X" });
    expect(toExcelCell("6222020200112233445")).toEqual({ value: "6222020200112233445" });
    expect(toExcelCell("00123")).toEqual({ value: "00123" });
    expect(toExcelCell("1234567890.123456")).toEqual({ value: "1234567890.123456" });
  });

  it("日期写成 Excel 日期", () => {
    expect(toExcelCell("2024-01-02")).toEqual({ value: new Date(Date.UTC(2024, 0, 2)), numFmt: "yyyy-mm-dd" });
    expect(toExcelCell("2024-01-02 10:05:00")).toEqual({
      value: new Date(Date.UTC(2024, 0, 2, 10, 5, 0)),
      numFmt: "yyyy-mm-dd hh:mm:ss",
    });
    expect(toExcelCell("2024-13-01")).toEqual({ value: "2024-13-01" });
  });
});
