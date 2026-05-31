/**
 * 顶部 header — logo + tagline + plan 开关
 */
interface ChatHeaderProps {
  enablePlan: boolean;
  onTogglePlan: (next: boolean) => void;
}

export function ChatHeader({ enablePlan, onTogglePlan }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] pb-3">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-[var(--accent)]">⚡</span> mini-buddy
        </h1>
        <p className="text-xs text-zinc-400">
          A mini Claude Code · Agent Loop + 5 tools + Structured Plan
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enablePlan}
            onChange={(e) => onTogglePlan(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span className="text-zinc-400">enable plan</span>
        </label>
      </div>
    </header>
  );
}
