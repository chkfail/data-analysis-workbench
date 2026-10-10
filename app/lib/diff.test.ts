import { describe, expect, it } from "vitest";
import type { DataRow } from "@/app/types";
import { buildKeyedDiffResult, buildUnkeyedDiffResult } from "@/app/lib/diff";

const columns = ["id", "name", "phone"];

describe("buildKeyedDiffResult", () => {
  it("识别新增、删除、修改、一致，重复 key 按顺序配对", () => {
    const oldRows: DataRow[] = [
      { id: "1", name: "张三", phone: "1" },
      { id: "2", name: "李四", phone: "2" },
      { id: "3", name: "王五", phone: "3" },
      { id: "3", name: "王五", phone: "33" },
    ];
    const newRows: DataRow[] = [
      { id: "1", name: "张三", phone: "1" },
      { id: "2", name: "李四", phone: "20" },
      { id: "3", name: "王五", phone: "3" },
      { id: "4", name: "赵六", phone: "4" },
    ];
    const result = buildKeyedDiffResult({
      oldRows,
      oldColumns: columns,
      newRows,
      newColumns: columns,
      mapping: { oldFields: ["id"], newFields: ["id"] },
      caseSensitive: false,
    });
    expect(result.unchangedCount).toBe(2);
    expect(result.modifiedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
    expect(result.addedCount).toBe(1);
    expect(result.duplicateKeyCount).toBe(1);
    expect(result.rows.find((row) => row.diffStatus === "modified")?.data["变更字段"]).toBe("phone: 2 → 20");
  });
});

/** 旧实现：剩余行逐一与全部新行比较，用来校验倒排索引优化结果一致 */
function bruteForce(oldRows: DataRow[], newRows: DataRow[]) {
  const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const sig = (row: DataRow) => JSON.stringify(columns.map((column) => norm(row[column])));
  const matchedOld = new Set<number>();
  const matchedNew = new Set<number>();
  const pairs: string[] = [];
  oldRows.forEach((row, oldIndex) => {
    const newIndex = newRows.findIndex((candidate, index) => !matchedNew.has(index) && sig(candidate) === sig(row));
    if (newIndex < 0) return;
    matchedOld.add(oldIndex);
    matchedNew.add(newIndex);
    pairs.push(`${oldIndex}-${newIndex}`);
  });
  oldRows.forEach((oldRow, oldIndex) => {
    if (matchedOld.has(oldIndex)) return;
    let best: { index: number; score: number } | null = null;
    newRows.forEach((newRow, newIndex) => {
      if (matchedNew.has(newIndex)) return;
      let comparable = 0;
      let equal = 0;
      columns.forEach((column) => {
        const a = norm(oldRow[column]);
        const b = norm(newRow[column]);
        if (!a && !b) return;
        comparable += 1;
        if (a === b) equal += 1;
      });
      const score = comparable === 0 ? 0 : equal / comparable;
      if (!best || score > best.score) best = { index: newIndex, score };
    });
    const found = best as { index: number; score: number } | null;
    if (found && found.score >= 0.7) {
      matchedOld.add(oldIndex);
      matchedNew.add(found.index);
      pairs.push(`${oldIndex}-${found.index}`);
    }
  });
  return { matchedOld, matchedNew, pairs: pairs.length };
}

describe("buildUnkeyedDiffResult", () => {
  it("与逐行全量比较的结果一致", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const makeRow = (): DataRow => ({
      id: String(Math.floor(random() * 30)),
      name: ["张三", "李四", "王五", ""][Math.floor(random() * 4)],
      phone: String(Math.floor(random() * 5)),
    });

    for (let round = 0; round < 30; round += 1) {
      const oldRows = Array.from({ length: 40 }, makeRow);
      const newRows = Array.from({ length: 40 }, makeRow);
      const result = buildUnkeyedDiffResult({
        oldRows,
        oldColumns: columns,
        newRows,
        newColumns: columns,
        caseSensitive: false,
      });
      const expected = bruteForce(oldRows, newRows);
      expect(result.deletedCount).toBe(oldRows.length - expected.matchedOld.size);
      expect(result.addedCount).toBe(newRows.length - expected.matchedNew.size);
      expect(result.modifiedCount + result.unchangedCount).toBe(expected.pairs);
    }
  });
});
