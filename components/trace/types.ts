/**
 * Trace 数据类型 — 镜像 lib/tracing.ts 的服务端类型
 *
 * 不直接 import 服务端 lib 是为了：
 *   1. 解耦（前端可独立演进 UI 不影响后端）
 *   2. 避免 server-only 代码（fs / nanoid）被打进客户端 bundle
 */
export interface TraceStep {
  index: number;
  durationMs: number;
  toolCalls: Array<{ toolName: string; args: unknown }>;
  toolResults: Array<{ toolName: string; success: boolean; error?: string }>;
  finishReason: string;
  text?: string;
}

export interface Trace {
  traceId: string;
  startedAt: number;
  finishedAt?: number;
  totalDurationMs?: number;
  userMessage: string;
  plan: string[] | null;
  steps: TraceStep[];
  finalFinishReason?: string;
  totalToolCalls: number;
  failedToolCalls: number;
  consecutiveFailures: number;
}

/** finish reason → 用户友好提示 */
export const FINISH_REASON_HINTS: Record<string, string> = {
  stop: "✓ 模型主动结束（正常完成）",
  "tool-calls": "→ 模型在调工具，还会继续",
  length: "⚠ 达到 max token 限制（输出被截断）",
  "step-count-exceeded": "⚠ 达到 maxSteps=10 上限（被强制停止）",
  "content-filter": "✗ 内容被过滤",
  error: "✗ 发生错误",
  unknown: "? 未知",
};
