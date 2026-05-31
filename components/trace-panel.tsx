"use client";
import { useState } from "react";

import { FinishBanner } from "./trace/finish-banner";
import { StepRow } from "./trace/step-row";
import { useTrace } from "./trace/use-trace";

/**
 * Trace 可观察性面板
 *
 * 编排 3 个子组件：
 *   - useTrace: 拉取持久化 trace 的 hook
 *   - FinishBanner: finish reason 提示条
 *   - StepRow: 每个 step 的折叠展示
 *
 * 整体折叠节省屏幕；点开后才加载详细。
 */
export function TracePanel({ traceId }: { traceId: string | null }) {
  const [open, setOpen] = useState(false);
  const { trace, error } = useTrace(traceId);

  if (!traceId) return null;

  return (
    <div className="border-t border-[var(--border)] mt-2">
      <TraceHeader
        traceId={traceId}
        steps={trace?.steps.length}
        durationMs={trace?.totalDurationMs}
        totalCalls={trace?.totalToolCalls}
        failedCalls={trace?.failedToolCalls}
        open={open}
        onToggle={() => setOpen(!open)}
      />

      {open && (
        <div className="px-3 pb-3 text-xs space-y-2 font-mono">
          {error && (
            <div className="text-[var(--error)]">load error: {error}</div>
          )}
          {!trace && !error && (
            <div className="text-zinc-500 italic">loading trace...</div>
          )}
          {trace && (
            <>
              <FinishBanner reason={trace.finalFinishReason} />

              {trace.consecutiveFailures > 0 && (
                <div className="bg-[var(--error)]/10 text-[var(--error)] px-2 py-1 rounded">
                  ⚠ ended with {trace.consecutiveFailures} consecutive tool
                  failures
                </div>
              )}

              <div className="space-y-1">
                {trace.steps.map((step) => (
                  <StepRow key={step.index} step={step} />
                ))}
              </div>

              {trace.plan && <PlanList plan={trace.plan} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface TraceHeaderProps {
  traceId: string;
  steps?: number;
  durationMs?: number;
  totalCalls?: number;
  failedCalls?: number;
  open: boolean;
  onToggle: () => void;
}

function TraceHeader({
  traceId,
  steps,
  durationMs,
  totalCalls,
  failedCalls,
  open,
  onToggle,
}: TraceHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-[var(--muted)]/40 transition"
    >
      <span>
        🔍 trace {traceId}
        {steps != null && (
          <span className="ml-2">
            · {steps} steps ·{" "}
            {durationMs != null
              ? `${(durationMs / 1000).toFixed(1)}s`
              : "..."}{" "}
            · {totalCalls} tool calls
            {failedCalls != null && failedCalls > 0 && (
              <span className="text-[var(--error)]"> ({failedCalls} failed)</span>
            )}
          </span>
        )}
      </span>
      <span>{open ? "▼" : "▶"}</span>
    </button>
  );
}

function PlanList({ plan }: { plan: string[] }) {
  return (
    <details>
      <summary className="cursor-pointer text-zinc-400">
        plan ({plan.length} steps)
      </summary>
      <ol className="list-decimal list-inside text-zinc-300 mt-1 space-y-0.5">
        {plan.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </details>
  );
}
