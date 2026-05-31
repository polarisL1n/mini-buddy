/**
 * Tracing 模块 — Agent 可观察性
 *
 * 提供轻量级 trace 收集：
 *  - traceId 标识每次会话
 *  - 每个 step 记录 toolCalls / toolResults / finishReason / duration
 *  - 失败次数累计（用于 system prompt 注入"已经失败 N 次"提示）
 *  - 持久化到 .traces/{traceId}.json，方便事后复盘
 *
 * 设计哲学：
 *   生产环境会接 Langfuse / OpenLLMetry，但本项目作为 demo 自己实现
 *   能让面试官当场看到完整 trace —— 这种"看得见的工程能力"比依赖外部服务更打动人。
 */
import { nanoid } from "nanoid";
import fs from "node:fs/promises";
import path from "node:path";

export interface TraceStep {
  index: number;
  startedAt: number;
  durationMs: number;
  toolCalls: Array<{
    toolName: string;
    args: unknown;
  }>;
  toolResults: Array<{
    toolName: string;
    success: boolean;
    error?: string;
  }>;
  finishReason: string;
  text?: string; // model's text output in this step
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
  consecutiveFailures: number; // 当前末尾连续失败次数
}

// 部署环境兼容：Vercel serverless 只能写 /tmp
const isServerless =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const TRACES_DIR = isServerless
  ? "/tmp/mini-buddy/.traces"
  : path.resolve(process.cwd(), ".traces");

export function createTrace(opts: {
  userMessage: string;
  plan: string[] | null;
}): Trace {
  return {
    traceId: nanoid(10),
    startedAt: Date.now(),
    userMessage: opts.userMessage,
    plan: opts.plan,
    steps: [],
    totalToolCalls: 0,
    failedToolCalls: 0,
    consecutiveFailures: 0,
  };
}

interface ToolCallLike {
  toolName?: string;
  input?: unknown;
}

interface ToolResultLike {
  toolName?: string;
  output?: unknown;
}

export function appendStep(
  trace: Trace,
  data: {
    startedAt: number;
    toolCalls?: ToolCallLike[];
    toolResults?: ToolResultLike[];
    finishReason?: string;
    text?: string;
  },
) {
  const calls = (data.toolCalls ?? []).map((c) => ({
    toolName: c.toolName ?? "unknown",
    args: c.input,
  }));

  const results = (data.toolResults ?? []).map((r) => {
    const out = r.output as
      | { success?: boolean; error?: string }
      | undefined;
    return {
      toolName: r.toolName ?? "unknown",
      success: out?.success !== false,
      error: out?.error,
    };
  });

  const failedHere = results.filter((r) => !r.success).length;
  trace.totalToolCalls += results.length;
  trace.failedToolCalls += failedHere;
  if (results.length > 0) {
    if (failedHere === results.length) {
      trace.consecutiveFailures += failedHere;
    } else {
      trace.consecutiveFailures = 0; // 有成功就重置
    }
  }

  trace.steps.push({
    index: trace.steps.length,
    startedAt: data.startedAt,
    durationMs: Date.now() - data.startedAt,
    toolCalls: calls,
    toolResults: results,
    finishReason: data.finishReason ?? "unknown",
    text: data.text,
  });
}

export function finalizeTrace(trace: Trace, finishReason?: string) {
  trace.finishedAt = Date.now();
  trace.totalDurationMs = trace.finishedAt - trace.startedAt;
  trace.finalFinishReason = finishReason;
}

/** 持久化 trace 到磁盘（生产环境会推到 Langfuse 等） */
export async function persistTrace(trace: Trace): Promise<string | null> {
  try {
    await fs.mkdir(TRACES_DIR, { recursive: true });
    const file = path.join(TRACES_DIR, `${trace.traceId}.json`);
    await fs.writeFile(file, JSON.stringify(trace, null, 2), "utf-8");
    return file;
  } catch (e) {
    console.warn("[trace] persist failed", e);
    return null;
  }
}

/** 友好打印（开发期 console 用） */
export function printTrace(trace: Trace) {
  // biome-ignore lint/suspicious/noConsole: dev-time tracing
  console.log("\n┌─────────────────────────────────────────────────────────");
  console.log(`│ trace ${trace.traceId} · ${trace.steps.length} steps · ${trace.totalDurationMs}ms`);
  console.log(`│ tool calls: ${trace.totalToolCalls}, failed: ${trace.failedToolCalls}`);
  console.log(`│ finish reason: ${trace.finalFinishReason ?? "ongoing"}`);
  console.log("├─────────────────────────────────────────────────────────");
  for (const step of trace.steps) {
    const tools = step.toolCalls.map((t) => t.toolName).join(", ") || "-";
    const fails = step.toolResults.filter((r) => !r.success).length;
    const failTag = fails > 0 ? ` ✗${fails}` : "";
    console.log(
      `│ #${step.index} [${step.finishReason}] ${tools}${failTag} (${step.durationMs}ms)`,
    );
  }
  console.log("└─────────────────────────────────────────────────────────\n");
}
