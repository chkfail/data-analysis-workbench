import type { DataRow, OutputRow } from "@/app/types";
import { formatValue, normalizeKey } from "@/app/lib/workbook";

export type DedupMode = "levenshtein" | "bigram";
export type BlockSize = "first-char" | "first-2-chars";

export type DedupResult = {
  rows: OutputRow[];
  columns: string[];
  clusterCount: number;
  involvedCount: number;
  recommendedCount: number;
  sourceCount: number;
};

/**
 * 分块键：按首字或首 2 字切分，限制全量比较范围。
 */
function blockKey(value: string, size: BlockSize) {
  const n = size === "first-2-chars" ? 2 : 1;
  return value.slice(0, n).toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  相似度算法                                                         */
/* ------------------------------------------------------------------ */

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

function levenshteinRatio(a: string, b: string) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function bigrams(s: string) {
  const result = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    result.add(s.slice(i, i + 2));
  }
  return result;
}

function bigramSimilarity(a: string, b: string) {
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  const union = new Set([...Array.from(bgA), ...Array.from(bgB)]);
  if (union.size === 0) return 1;
  const intersection = new Set(Array.from(bgA).filter((x) => bgB.has(x)));
  return intersection.size / union.size;
}

function computeSimilarity(a: string, b: string, algorithm: DedupMode) {
  return algorithm === "bigram"
    ? bigramSimilarity(a, b)
    : levenshteinRatio(a, b);
}

function exactKey(row: DataRow, exactFields: string[]) {
  return JSON.stringify(exactFields.map((field) => formatValue(row[field])));
}

function exactFieldsMatch(a: DataRow, b: DataRow, exactFields: string[]) {
  return exactFields.every((field) => formatValue(a[field]) === formatValue(b[field]));
}

/* ------------------------------------------------------------------ */
/*  Union-Find                                                        */
/* ------------------------------------------------------------------ */

class UnionFind {
  private parent: Map<number, number>;
  private rank: Map<number, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  find(x: number): number {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }
    if (p !== x) {
      const root = this.find(p);
      this.parent.set(x, root);
      return root;
    }
    return x;
  }

  union(x: number, y: number) {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;

    const rankX = this.rank.get(rx) ?? 0;
    const rankY = this.rank.get(ry) ?? 0;

    if (rankX < rankY) {
      this.parent.set(rx, ry);
    } else if (rankX > rankY) {
      this.parent.set(ry, rx);
    } else {
      this.parent.set(ry, rx);
      this.rank.set(rx, rankX + 1);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  质心选取：组内非空字段最多的行                                        */
/* ------------------------------------------------------------------ */

function countNonEmpty(row: DataRow) {
  return Object.values(row).filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== "",
  ).length;
}

function pickCentroid(indices: number[], rows: DataRow[]) {
  let best = indices[0];
  let bestScore = countNonEmpty(rows[best]);

  for (let i = 1; i < indices.length; i++) {
    const score = countNonEmpty(rows[indices[i]]);
    if (score > bestScore) {
      bestScore = score;
      best = indices[i];
    }
  }

  return best;
}

/* ------------------------------------------------------------------ */
/*  聚类校验：组内成员必须与质心相似度 ≥ 阈值                              */
/* ------------------------------------------------------------------ */

function validateClusters(
  rawClusters: number[][],
  rows: DataRow[],
  fields: string[],
  exactFields: string[],
  algorithm: DedupMode,
  threshold: number,
): { valid: number[][]; singles: number[] } {
  const valid: number[][] = [];
  const singles: number[] = [];

  for (const cluster of rawClusters) {
    if (cluster.length < 2) {
      if (cluster.length === 1) singles.push(cluster[0]);
      continue;
    }

    if (cluster.length === 2) {
      valid.push(cluster);
      continue;
    }

    const centroid = pickCentroid(cluster, rows);
    const keep: number[] = [];
    const stray: number[] = [];

    // 多字段组合相似度
    const simToCentroid = (idx: number) => {
      const scores = fields.map((f) =>
        computeSimilarity(
          normalizeKey(rows[centroid][f]),
          normalizeKey(rows[idx][f]),
          algorithm,
        ),
      );
      return scores.reduce((sum, s) => sum + s, 0) / scores.length;
    };

    for (const idx of cluster) {
      if (idx === centroid) {
        keep.push(idx);
        continue;
      }
      const sim = simToCentroid(idx);
      if (exactFieldsMatch(rows[centroid], rows[idx], exactFields) && sim >= threshold) {
        keep.push(idx);
      } else {
        stray.push(idx);
      }
    }

    valid.push(keep);
    if (stray.length > 1) {
      valid.push(stray);
    } else if (stray.length === 1) {
      singles.push(stray[0]);
    }
  }

  return { valid, singles };
}

/* ------------------------------------------------------------------ */
/*  主入口                                                            */
/* ------------------------------------------------------------------ */

export function buildDedupResult({
  rows,
  columns,
  fields,
  exactFields,
  algorithm,
  threshold,
  blockSize,
}: {
  rows: DataRow[];
  columns: string[];
  fields: string[];
  exactFields: string[];
  algorithm: DedupMode;
  threshold: number;
  blockSize: BlockSize;
}): DedupResult {
  if (fields.length === 0 || rows.length === 0) {
    return {
      rows: [],
      columns: [],
      clusterCount: 0,
      involvedCount: 0,
      recommendedCount: 0,
      sourceCount: rows.length,
    };
  }

  // 多字段组合相似度：对各字段分别计算，取均值
  const multiSimilarity = (a: DataRow, b: DataRow) => {
    const scores = fields.map((f) =>
      computeSimilarity(normalizeKey(a[f]), normalizeKey(b[f]), algorithm),
    );
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  };

  // 分块用首个字段
  const blockField = fields[0];

  // 1. 分块
  const buckets = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const key = normalizeKey(row[blockField]);
    if (!key) return;
    const bk = `${exactKey(row, exactFields)}:${blockKey(key, blockSize)}`;
    const bucket = buckets.get(bk) ?? [];
    bucket.push(index);
    buckets.set(bk, bucket);
  });

  // 2. 块内两两比较 + Union-Find
  const uf = new UnionFind();
  const pairsCompared: Set<string> = new Set();

  for (const indices of Array.from(buckets.values())) {
    if (indices.length < 2) continue;

    for (let i = 0; i < indices.length; i++) {
      const idxA = indices[i];

      for (let j = i + 1; j < indices.length; j++) {
        const idxB = indices[j];
        const pairKey = `${Math.min(idxA, idxB)}-${Math.max(idxA, idxB)}`;
        if (pairsCompared.has(pairKey)) continue;
        pairsCompared.add(pairKey);

        if (!exactFieldsMatch(rows[idxA], rows[idxB], exactFields)) continue;

        const sim = multiSimilarity(rows[idxA], rows[idxB]);

        if (sim >= threshold) {
          uf.union(idxA, idxB);
        }
      }
    }
  }

  // 3. Union-Find 结果按根分组
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const root = uf.find(i);
    // 只收集被 union 过的（即至少有一条候选边的）
    if (uf.find(i) !== i || uf.find(i) === i) {
      const group = groupMap.get(root) ?? [];
      group.push(i);
      groupMap.set(root, group);
    }
  }

  // 筛选出 size >= 2 的组作为 raw clusters
  const rawClusters = Array.from(groupMap.values()).filter(
    (g) => g.length >= 2,
  );

  // 4. 质心校验
  const { valid: clusters } = validateClusters(
    rawClusters,
    rows,
    fields,
    exactFields,
    algorithm,
    threshold,
  );

  // 5. 构建输出
  const usedIndices = new Set<number>();
  const outputRows: OutputRow[] = [];
  const outputColumns = ["重复组", "推荐保留", ...columns];

  clusters.forEach((cluster, clusterIndex) => {
    const centroid = pickCentroid(cluster, rows);
    const groupId = `组-${String(clusterIndex + 1).padStart(2, "0")}`;

    // 质心排第一，其余按相似度降序
    const ordered = [
      centroid,
      ...cluster
        .filter((idx) => idx !== centroid)
        .sort(
          (a, b) =>
            multiSimilarity(rows[centroid], rows[b]) -
            multiSimilarity(rows[centroid], rows[a]),
        ),
    ];

    ordered.forEach((idx, rank) => {
      usedIndices.add(idx);
      outputRows.push({
        id: String(idx),
        data: {
          重复组: groupId,
          推荐保留: rank === 0 ? "★ 推荐保留" : "推荐删除",
          ...Object.fromEntries(
            columns.map((col) => [col, formatValue(rows[idx][col])]),
          ),
        },
      });
    });
  });

  // 6. 追加无重复的行
  rows.forEach((row, index) => {
    if (usedIndices.has(index)) return;
    outputRows.push({
      id: String(index),
      data: {
        重复组: "",
        推荐保留: "",
        ...Object.fromEntries(
          columns.map((col) => [col, formatValue(row[col])]),
        ),
      },
    });
  });

  const involvedCount = usedIndices.size;
  const recommendedCount = clusters.length;
  const clusterCount = clusters.length;

  return {
    rows: outputRows,
    columns: outputColumns,
    clusterCount,
    involvedCount,
    recommendedCount,
    sourceCount: rows.length,
  };
}
