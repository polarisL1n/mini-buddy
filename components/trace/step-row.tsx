"use client";
import { useState } from "react";
import type { TraceStep } from "./types";

/**
 * 单步 trace 渲染：折叠态显示工具列表 + 失败数 + 耗时；展开看完整 input/output
 */
export function StepRow({ step }: { step: TraceStep }) {
  const [expanded, setExpanded] = useState(false);
  const tools = step.toolCalls.map((t) => t.toolName).join(", ") || "(no tool)";
  const fails = step.toolResults.filter((r) => !r.success).length;
  const allFail = fails > 0 && fails === step.toolResults.length;

  const borderColor = allFail
    ? "border-[var(--error)]"
    : fails > 0
      ? "border-yellow-500"
      : "border-[var(--border)]";

  return (
    <div className={`border-l-2 pl-2 ${borderColor}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left hover:text-zinc-200"
      >
        <span className="text-zinc-500">#{step.index}</span>{" "}
        <span className="text-zinc-300">[{step.finishReason}]</span>{" "}
        <span>{tools}</span>{" "}
        {fails > 0 && <span className="text-[var(--error)]">✗{fails}</span>}
        <span className="text-zinc-500"> · {step.durationMs}ms</span>
      </button>
      {expanded && <StepDetails step={step} />}
    </div>
  );
}

function StepDetails({ step }: { step: TraceStep }) {
  return (
    <div className="ml-4 mt-1 space-y-1 text-zinc-400">
      {step.toolCalls.map((c, i) => (
        <details key={`call-${i}`}>
          <summary className="cursor-pointer">
            call: <span className="text-zinc-200">{c.toolName}</span>
          </summary>
          <pre className="bg-black/40 p-1.5 rounded mt-1 overflow-x-auto text-[10px]">
            {JSON.stringify(c.args, null, 2)}
          </pre>
        </details>
      ))}
      {step.toolResults.map((r, i) => (
        <div key={`result-${i}`}>
          <span
            className={
              r.success ? "text-[var(--success)]" : "text-[var(--error)]"
            }
          >
            {r.success ? "✓" : "✗"} {r.toolName}
          </span>
          {r.error && (
            <span className="text-[var(--error)] ml-2">{r.error}</span>
          )}
        </div>
      ))}
      {step.text && (
        <details>
          <summary className="cursor-pointer">model text</summary>
          <pre className="bg-black/40 p-1.5 rounded mt-1 whitespace-pre-wrap text-[10px]">
            {step.text}
          </pre>
        </details>
      )}
    </div>
  );
}
