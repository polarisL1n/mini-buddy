"use client";
import { useState } from "react";

/**
 * ReasoningPart — 推理模型（v4-pro / o1 / Claude thinking）的思考过程
 *
 * 为什么默认折叠？
 *   推理模型的 thinking 通常 1k-5k 字符，全展开会淹没主回答。
 *   折叠 + 字符数提示 = 用户知道有 thinking 但不强制阅读。
 */
export function ReasoningPart({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="border-l-2 border-purple-500/50 pl-3 my-2 bg-purple-500/5 rounded-r">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left text-xs text-purple-300/80 py-1 hover:text-purple-200 flex items-center gap-1"
      >
        <span>🧠</span>
        <span>thinking</span>
        <span className="text-purple-400/60">({text.length} chars)</span>
        <span className="ml-auto">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <pre className="text-xs text-purple-200/80 pb-2 whitespace-pre-wrap font-sans leading-relaxed italic">
          {text}
        </pre>
      )}
    </div>
  );
}
