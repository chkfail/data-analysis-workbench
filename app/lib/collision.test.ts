import { describe, expect, it } from "vitest";
import type { CollisionTableRuntime, DataRow } from "@/app/types";
import { buildCollisionResult, MAX_COLLISION_ROWS, stripCollisionExportPrefix } from "@/app/lib/collision";

function table(title: string, rows: DataRow[], field = "id"): CollisionTableRuntime {
  return { id: `collision-${title}`, title, workbook: null, field, rows, columns: Object.keys(rows[0] ?? {}) };
}

describe("buildCollisionResult", () => {
  const base = table("基准表", [{ id: "A", name: "张三" }, { id: "b", name: "李四" }, { id: "c", name: "王五" }]);
  const join = table("参与表 A", [{ id: "a", phone: "1" }, { id: "B", phone: "2" }, { id: "B", phone: "2" }]);

  it("补全基准表：未命中保留，默认不区分大小写，整行去重", () => {
    const result = buildCollisionResult({ matchMode: "complete", tables: [base, join], caseSensitive: false });
    expect(result.rows.map((row) => row.data["状态"])).toEqual(["命中", "命中", "未命中"]);
    expect(result.matched).toBe(2);
    expect(result.leftOnly).toBe(1);
    expect(result.columns).toContain("参与表 A.phone");
  });

  it("只取交集 + 区分大小写", () => {
    const result = buildCollisionResult({ matchMode: "collision", tables: [base, join], caseSensitive: true });
    expect(result.rows).toHaveLength(0);
  });

  it("重复键过多时截断并给出预计行数", () => {
    const many = Array.from({ length: 1000 }, (_, index) => ({ id: "x", n: String(index) }));
    const result = buildCollisionResult({
      matchMode: "collision",
      tables: [table("基准表", many), table("参与表 A", many)],
      caseSensitive: false,
    });
    expect(result.truncated).toBe(true);
    expect(result.estimatedRows).toBe(1_000_000);
    expect(result.rows.length).toBe(MAX_COLLISION_ROWS);
  });

  it("导出去掉表名前缀", () => {
    expect(stripCollisionExportPrefix("参与表 A.姓名")).toBe("姓名");
    expect(stripCollisionExportPrefix("基准表.姓名")).toBe("姓名");
  });
});
