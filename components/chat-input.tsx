"use client";
import { useState } from "react";

/**
 * 输入区 — 受控文本框 + send/stop 按钮切换
 *
 * 设计：把表单状态（input 字符串）封闭在自己内部，
 * 父组件只关心"用户提交了什么"和"用户想停止"。
 */
interface ChatInputProps {
  isLoading: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
  placeholder?: string;
}

export function ChatInput({
  isLoading,
  onSubmit,
  onStop,
  placeholder = 'Try: "Create a hello.ts that prints hello world, then run it"',
}: ChatInputProps) {
  const [input, setInput] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSubmit(input);
        setInput("");
      }}
      className="flex gap-2 border-t border-[var(--border)] pt-3"
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1 px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--accent)] disabled:opacity-60"
      />
      {isLoading ? (
        <button
          type="button"
          onClick={onStop}
          className="px-4 py-3 bg-[var(--error)] text-white rounded-md hover:opacity-90"
        >
          stop
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-5 py-3 bg-[var(--accent)] text-zinc-900 rounded-md font-medium hover:opacity-90 disabled:opacity-40"
        >
          send
        </button>
      )}
    </form>
  );
}
