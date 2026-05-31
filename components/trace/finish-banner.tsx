import { FINISH_REASON_HINTS } from "./types";

/**
 * Finish reason 提示条 — 显示 stop / step-count-exceeded / 等终止原因
 * 颜色按"是否符合预期"高亮
 */
export function FinishBanner({ reason }: { reason?: string }) {
  const cls =
    reason === "stop"
      ? "bg-[var(--success)]/10 text-[var(--success)]"
      : reason === "step-count-exceeded"
        ? "bg-[var(--error)]/10 text-[var(--error)]"
        : "bg-zinc-700/30 text-zinc-300";

  return (
    <div className={`px-2 py-1 rounded ${cls}`}>
      <strong>finish reason:</strong> {reason ?? "ongoing"}
      <span className="ml-2 text-zinc-400">
        {FINISH_REASON_HINTS[reason ?? "unknown"] ?? ""}
      </span>
    </div>
  );
}
