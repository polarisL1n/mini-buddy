/**
 * 共享 UI 类型 — 镜像 Vercel AI SDK 的 UIMessage 结构
 *
 * 为什么不直接用 SDK 的 UIMessage 类型？
 *   v6 的 UIMessage 是泛型 + Discriminated Union，在组件 props 里使用很啰嗦。
 *   这里抽出最小子集，专注于 part.type 路由分发。
 */

export interface MessagePart {
  type: string;
  text?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}

export interface UIMessageLike {
  id: string;
  role: string;
  parts?: MessagePart[];
}

export interface ToolPart {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}
