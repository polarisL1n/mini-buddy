"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";

import { ChatHeader } from "@/components/chat-header";
import { ChatInput } from "@/components/chat-input";
import { EmptyHint } from "@/components/empty-hint";
import { LoadingPulse } from "@/components/loading-pulse";
import { MessageBlock } from "@/components/message-block";
import { TracePanel } from "@/components/trace-panel";
import type { UIMessageLike } from "@/components/types";

/**
 * 主页 — 编排所有子组件
 *
 * 这一层只做三件事：
 *   1. useChat 接 Vercel AI SDK
 *   2. 自定义 fetch 拦截 X-Trace-Id 响应头
 *   3. 自动滚动到底部
 *
 * 渲染逻辑全部下沉到独立组件（ChatHeader / MessageBlock / ChatInput / ...）
 */
export default function Home() {
  const [enablePlan, setEnablePlan] = useState(true);
  const [traceId, setTraceId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 拦截响应头里的 X-Trace-Id（Vercel AI SDK 不直接暴露这个）
  const customFetch: typeof fetch = async (url, init) => {
    const res = await fetch(url, init);
    const tid = res.headers.get("X-Trace-Id");
    if (tid) setTraceId(tid);
    return res;
  };

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent",
      body: () => ({ enablePlan }),
      fetch: customFetch,
    }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-screen max-w-4xl w-full mx-auto p-4 gap-4">
      <ChatHeader enablePlan={enablePlan} onTogglePlan={setEnablePlan} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 && <EmptyHint />}
        {messages.map((m) => (
          <MessageBlock key={m.id} message={m as UIMessageLike} />
        ))}
        {isLoading && <LoadingPulse />}
        {error && (
          <div className="text-[var(--error)] text-sm font-mono p-3 bg-[var(--muted)] rounded">
            ⚠ {error.message}
          </div>
        )}
        {traceId && !isLoading && <TracePanel traceId={traceId} />}
      </div>

      <ChatInput
        isLoading={isLoading}
        onSubmit={(text) => sendMessage({ text })}
        onStop={stop}
      />
    </div>
  );
}
