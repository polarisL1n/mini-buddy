"use client";
import { useState } from "react";

import { ToolOutputRouter } from "./tool-renderers";
import type { ToolPart } from "./types";

const TOOL_ICONS: Record<string, string> = {
  read_file: "📖",
  write_file: "✏️",
  bash: "⌨",
  search: "🔍",
  delegate_task: "🤝",
};

/**
 * 单个 tool 调用的容器组件
 *
 * 职责：
 *   - 解析 part 元数据（toolName / state / output）
 *   - 状态徽章（running / ✓ / ✗）
 *   - 折叠/展开
 *   - 把具体输出渲染下放给 ToolOutputRouter
 *
 * 注意：write_file 默认展开（diff 是核心信息），其他默认折叠
 */
export function ToolCallView({ part }: { part: ToolPart }) {
  const toolName = part.type?.replace(/^tool-/, "") ?? part.toolName ?? "tool";
  const icon = TOOL_ICONS[toolName] ?? "🔧";
  const state = part.state ?? "input-available";
  const isRunning = state === "input-streaming" || state === "input-available";
  const isDone = state === "output-available";
  const hasError = state === "output-error";

  const [expanded, setExpanded] = useState(toolName === "write_file");

  const output = part.output as
    | { success?: boolean; error?: string; [k: string]: unknown }
    | undefined;
  const success = output?.success !== false && !hasError;

  return (
    <div
      className={`border rounded-md overflow-hidden text-sm ${
        hasError || output?.success === false
          ? "border-[var(--error)] bg-red-950/20"
          : "border-[var(--border)] bg-[var(--muted)]/40"
      }`}
    >
      <ToolHeader
        icon={icon}
        toolName={toolName}
        isRunning={isRunning}
        isDone={isDone}
        success={success}
        hasError={hasError || output?.success === false}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {part.input != null && (
            <details>
              <summary className="text-xs text-zinc-400 cursor-pointer">
                input
              </summary>
              <pre className="text-xs bg-black/40 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </details>
          )}
          {output && <ToolOutputRouter toolName={toolName} output={output} />}
        </div>
      )}
    </div>
  );
}

interface ToolHeaderProps {
  icon: string;
  toolName: string;
  isRunning: boolean;
  isDone: boolean;
  success: boolean;
  hasError: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function ToolHeader({
  icon,
  toolName,
  isRunning,
  isDone,
  success,
  hasError,
  expanded,
  onToggle,
}: ToolHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--muted)] transition"
    >
      <div className="flex items-center gap-2 font-mono text-xs">
        <span>{icon}</span>
        <span className="font-semibold">{toolName}</span>
        {isRunning && <span className="text-zinc-400 italic">running...</span>}
        {isDone && success && <span className="text-[var(--success)]">✓</span>}
        {hasError && <span className="text-[var(--error)]">✗</span>}
      </div>
      <span className="text-xs text-zinc-500">{expanded ? "▼" : "▶"}</span>
    </button>
  );
}
