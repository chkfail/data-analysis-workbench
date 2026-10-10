import { describe, expect, it } from "vitest";
import { buildLatestResult } from "@/app/lib/latest";

describe("buildLatestResult", () => {
  it("每个基准字段保留最新一条，兼容多种时间格式", () => {
    const rows = [
      { 号码: "1", 时间: "2024年1月2日 10时5分", 备注: "a" },
      { 号码: "1", 时间: "2024/1/3", 备注: "b" },
      { 号码: "2", 时间: "20240101", 备注: "c" },
      { 号码: "2", 时间: "看不懂", 备注: "d" },
      { 号码: "", 时间: "2024-01-01", 备注: "e" },
    ];
    const result = buildLatestResult({ rows, columns: ["号码", "时间", "备注"], baseField: "号码", timeField: "时间" });
    expect(result.rows.map((row) => row.data["备注"])).toEqual(["b", "c"]);
    expect(result.ignored).toBe(1);
    expect(result.unparsedTime).toBe(1);
  });
});
