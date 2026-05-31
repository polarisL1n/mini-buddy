/**
 * thinking 状态指示器 — 流式开始前的小心跳点
 */
export function LoadingPulse() {
  return (
    <div className="text-zinc-400 text-sm flex items-center gap-2">
      <span className="inline-block w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
      thinking...
    </div>
  );
}
