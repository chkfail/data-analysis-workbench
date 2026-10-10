import { buildCollisionResult } from "@/app/lib/collision";
import { buildDedupResult } from "@/app/lib/dedup";
import { buildKeyedDiffResult, buildUnkeyedDiffResult } from "@/app/lib/diff";
import { buildExtractResult } from "@/app/lib/extract";
import { buildLatestResult } from "@/app/lib/latest";
import { buildMergeResult } from "@/app/lib/merge";
import { buildSearchResult } from "@/app/lib/search";

/**
 * 所有放进 Web Worker 的计算任务。新增工具时在这里登记，
 * 组件侧通过 useComputation(kind, input) 调用。
 */
const COMPUTE_HANDLERS = {
  collision: buildCollisionResult,
  dedup: buildDedupResult,
  diffKeyed: buildKeyedDiffResult,
  diffUnkeyed: buildUnkeyedDiffResult,
  extract: buildExtractResult,
  latest: buildLatestResult,
  merge: buildMergeResult,
  search: buildSearchResult,
};

type Handlers = typeof COMPUTE_HANDLERS;

export type ComputeKind = keyof Handlers;
export type ComputeInput<K extends ComputeKind> = Parameters<Handlers[K]>[0];
export type ComputeOutput<K extends ComputeKind> = ReturnType<Handlers[K]>;

export type ComputeRequest = { seq: number; kind: ComputeKind; input: unknown };
export type ComputeResponse = { seq: number; result?: unknown; error?: string };

export function runCompute<K extends ComputeKind>(kind: K, input: ComputeInput<K>): ComputeOutput<K> {
  const handler = COMPUTE_HANDLERS[kind] as (input: ComputeInput<K>) => ComputeOutput<K>;
  return handler(input);
}
