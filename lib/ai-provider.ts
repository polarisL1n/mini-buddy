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
 * 模型选择策略
 *
 * 默认全用 deepseek-v4-pro（推理模型）：
 *   - Agent Loop 需要多步决策、错误反思、温柔降级 → v4-pro
 *   - Plan 阶段需要理解任务并合理拆解 → v4-pro 输出更稳定
 *   - Sub-agent 经常做研究/总结类任务，质量优先 → v4-pro
 *
 * 仍然保留环境变量分档，便于未来按用例区分模型节省成本：
 *   MODEL_PLAN=deepseek-v4-flash      # 简单 JSON 规划可降到 flash
 *   MODEL_DELEGATE=deepseek-v4-flash  # 简单子任务可降到 flash
 *
 * 老模型 deepseek-chat / deepseek-reasoner 将于 2026/07/24 弃用，
 * 这里直接采用 v4 系列作为默认。
 */
export const MODEL_AGENT = process.env.MODEL_AGENT || "deepseek-v4-pro";
export const MODEL_PLAN = process.env.MODEL_PLAN || "deepseek-v4-pro";
export const MODEL_DELEGATE =
  process.env.MODEL_DELEGATE || "deepseek-v4-pro";
