"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  runCompute,
  type ComputeInput,
  type ComputeKind,
  type ComputeOutput,
  type ComputeResponse,
} from "@/app/lib/compute";

export type ComputationState<T> = {
  result: T;
  /** 新参数已提交、结果尚未返回 */
  pending: boolean;
  /** 用户取消了本次计算，result 仍是上一次的结果 */
  cancelled: boolean;
  cancel: () => void;
};

function createWorker() {
  if (typeof Worker === "undefined") return null;
  try {
    return new Worker(new URL("../workers/compute.worker.ts", import.meta.url));
  } catch {
    return null;
  }
}

/**
 * 在 Web Worker 中执行业务计算，主线程不卡顿。
 * - input 为 null 时直接返回 empty；input 需要 useMemo 保持引用稳定。
 * - 参数变化会在 delay 毫秒后提交，期间再变化只保留最后一次。
 * - 上一次计算未结束时提交新参数，会直接终止旧 Worker，丢弃旧计算。
 * - 环境不支持 Worker 时退化为主线程同步计算。
 */
export function useComputation<K extends ComputeKind>(
  kind: K,
  input: ComputeInput<K> | null,
  empty: ComputeOutput<K>,
  { delay = 120, onError }: { delay?: number; onError?: (message: string) => void } = {},
): ComputationState<ComputeOutput<K>> {
  const [result, setResult] = useState<ComputeOutput<K>>(empty);
  const [pending, setPending] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    busyRef.current = false;
  }, []);

  useEffect(() => stopWorker, [stopWorker]);

  useEffect(() => {
    const seq = ++seqRef.current;
    setCancelled(false);

    if (!input) {
      if (busyRef.current) stopWorker();
      setResult(empty);
      setPending(false);
      return;
    }

    setPending(true);
    const finish = (response: ComputeResponse) => {
      if (response.seq !== seqRef.current) return;
      busyRef.current = false;
      setPending(false);
      if (response.error !== undefined) {
        onErrorRef.current?.(`计算失败：${response.error}`);
        return;
      }
      setResult(response.result as ComputeOutput<K>);
    };

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (busyRef.current) stopWorker();
      if (!workerRef.current) workerRef.current = createWorker();
      const worker = workerRef.current;

      if (!worker) {
        try {
          finish({ seq, result: runCompute(kind, input) });
        } catch (error) {
          finish({ seq, error: error instanceof Error ? error.message : String(error) });
        }
        return;
      }

      worker.onmessage = (event: MessageEvent<ComputeResponse>) => finish(event.data);
      worker.onerror = (event) => {
        event.preventDefault();
        stopWorker();
        finish({ seq, error: event.message || "计算进程异常退出" });
      };
      busyRef.current = true;
      worker.postMessage({ seq, kind, input });
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    // empty 是模块级常量，不参与依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, input, delay, stopWorker]);

  const cancel = useCallback(() => {
    seqRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    stopWorker();
    setPending(false);
    setCancelled(true);
  }, [stopWorker]);

  return { result, pending, cancelled, cancel };
}
