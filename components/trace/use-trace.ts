"use client";
import { useEffect, useState } from "react";
import type { Trace } from "./types";

/**
 * useTrace — 根据 traceId 拉取持久化 trace
 *
 * 为什么有 800ms 延迟？
 *   onFinish 触发 persistTrace 写文件是异步的，立即 fetch 大概率 404。
 *   800ms 是经验值，覆盖 99% 的小到中等任务。
 *   生产环境会用 SSE 推送 trace 状态而不是轮询。
 */
export function useTrace(traceId: string | null) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;
    setTrace(null);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trace/${traceId}`);
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as Trace;
        setTrace(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [traceId]);

  return { trace, error };
}
