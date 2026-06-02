import { createOpenAI } from "@ai-sdk/openai";

/**
 * DeepSeek 官方 API（OpenAI 兼容 Chat Completions 协议）
 *
 * baseURL 注意事项：
 *   - 官方文档列出 https://api.deepseek.com（无 /v1）
 *   - 实际两者都通：/v1 是 OpenAI 兼容标准前缀，去掉也能用
 *   - 我们保持 /v1 以最大化与 OpenAI SDK 默认行为兼容
 *
 * @ai-sdk/openai v3 端点踩坑：
 *   v3 默认走新版 /v1/responses（OpenAI Responses API），DeepSeek 只支持
 *   老版 /v1/chat/completions，使用时必须显式调 .chat()。
 *   所有 OpenAI 兼容第三方厂商（DeepSeek/Moonshot/智谱/通义）同理。
 */
export const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/**
 * 模型选择策略 — 按角色分层选模型
 *
 * 核心思想：**不是所有调用都需要最强模型**。Agent 系统的成本控制关键在于
 * 给每个角色匹配"刚好够用"的模型。这是工业级 Agent 的标配做法。
 *
 * 当前分层：
 *
 * ┌────────────────┬─────────────────┬──────────────────────────────────┐
 * │ 角色            │ 默认模型         │ 选型理由                          │
 * ├────────────────┼─────────────────┼──────────────────────────────────┤
 * │ MODEL_AGENT    │ deepseek-v4-pro │ 主 Agent 要做多步决策、错误反思、    │
 * │ (主决策者)      │ (推理模型)       │ 工具失败时温柔降级——必须强推理      │
 * ├────────────────┼─────────────────┼──────────────────────────────────┤
 * │ MODEL_PLAN     │ deepseek-v4-pro │ Plan 输出 JSON Schema 合规的步骤，   │
 * │ (任务规划)      │ (推理模型)       │ 拆解质量直接影响主 Agent 执行         │
 * ├────────────────┼─────────────────┼──────────────────────────────────┤
 * │ MODEL_DELEGATE │ deepseek-v4-flash│ 子 Agent 做单一任务（研究/总结），    │
 * │ (子 Agent)     │ (轻量模型)       │ 上下文小、推理需求轻——flash 性价比高 │
 * └────────────────┴─────────────────┴──────────────────────────────────┘
 *
 * 这种分层在主 Agent 频繁派子 Agent 的场景下能省 60%+ token 成本，
 * 同时不显著降低质量——因为子 Agent 任务通常已经被主 Agent 拆解到位了。
 *
 * 老模型 deepseek-chat / deepseek-reasoner 将于 2026/07/24 弃用。
 */
export const MODEL_AGENT = process.env.MODEL_AGENT || "deepseek-v4-pro";
export const MODEL_PLAN = process.env.MODEL_PLAN || "deepseek-v4-pro";
export const MODEL_DELEGATE =
  process.env.MODEL_DELEGATE || "deepseek-v4-flash";
