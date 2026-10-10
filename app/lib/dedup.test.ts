import { describe, expect, it } from "vitest";
import { buildDedupResult } from "@/app/lib/dedup";

const rows = [
  { 姓名: "张三丰", 城市: "北京" },
  { 姓名: "章三丰", 城市: "北京" },
  { 姓名: "张三风", 城市: "上海" },
  { 姓名: "李四", 城市: "北京" },
];

function run(overrides: Partial<Parameters<typeof buildDedupResult>[0]> = {}) {
  return buildDedupResult({
    rows,
    columns: ["姓名", "城市"],
    fields: ["姓名"],
    exactFields: [],
    algorithm: "levenshtein",
    threshold: 0.6,
    blockSize: "first-char",
    caseSensitive: false,
    ...overrides,
  });
}

describe("buildDedupResult", () => {
  it("首字分块只在块内比较", () => {
    const result = run();
    expect(result.clusterCount).toBe(1);
    expect(result.involvedCount).toBe(2); // 张三丰 + 张三风
  });

  it("不分块能发现首字不同的重复", () => {
    const result = run({ blockSize: "none" });
    expect(result.clusterCount).toBe(1);
    expect(result.involvedCount).toBe(3);
  });

  it("完全一致字段约束", () => {
    const result = run({ blockSize: "none", exactFields: ["城市"] });
    expect(result.involvedCount).toBe(2); // 只有北京的张三丰 + 章三丰
    expect(result.rows[0].data["推荐保留"]).toBe("★ 推荐保留");
  });
});
