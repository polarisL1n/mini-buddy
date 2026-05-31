/**
 * MessageBlock — 单条对话消息渲染器
 *
 * 职责：根据 part.type 路由到对应渲染器：
 *   - text → 普通段落
 *   - reasoning → 紫色折叠 thinking
 *   - tool-* → ToolCallView
 *   - step-start / step-end → 不渲染
 */
import type { UIMessageLike } from "./types";
import { ReasoningPart } from "./reasoning-part";
import { ToolCallView } from "./tool-call-view";

export function MessageBlock({ message }: { message: UIMessageLike }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`p-4 rounded-lg ${
        isUser
          ? "bg-[var(--muted)] border border-[var(--border)] ml-auto max-w-[80%]"
          : "bg-transparent"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
        {isUser ? "you" : "mini-buddy"}
      </div>
      <div className="space-y-2">
        {message.parts?.map((part, i) => renderPart(part, i))}
      </div>
    </div>
  );
}

function renderPart(part: { type: string; text?: string }, key: number) {
  if (part.type === "text") {
    return (
      <div key={key} className="whitespace-pre-wrap leading-relaxed">
        {part.text}
      </div>
    );
  }
  if (part.type === "reasoning") {
    return <ReasoningPart key={key} text={part.text ?? ""} />;
  }
  if (part.type.startsWith("tool-")) {
    return <ToolCallView key={key} part={part} />;
  }
  // step-start / step-end / 未知类型 → 静默忽略
  return null;
}
