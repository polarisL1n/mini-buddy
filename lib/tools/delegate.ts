import { tool, generateText } from "ai";
import { z } from "zod";
import { deepseek, MODEL_DELEGATE } from "../ai-provider";

/**
 * delegate_task — 多 Agent 协作的核心
 *
 * 设计灵感：Claude Code 的 Task tool
 *
 * 关键特性：
 *  1. 子 Agent 在隔离上下文执行（不共享主对话历史）
 *  2. 主 Agent 必须显式传入子 Agent 需要的 context
 *  3. 子 Agent 只返回最终结论（不返回过程），降低主上下文压力
 *
 * 适用场景：
 *  - 独立子任务（分析一段代码、研究一个概念、总结一个文档）
 *  - 不需要主 Agent 历史背景的任务
 *
 * 反模式：
 *  - 用它做多步操作（直接在主 Agent 用 tool 更高效）
 *  - 用它处理需要长期记忆的任务（隔离上下文做不到）
 */
export const delegateTask = tool({
  description:
    "Delegate an independent sub-task to a sub-agent running in isolated context. The sub-agent only sees what you pass in (task + optional context). Returns the sub-agent's final conclusion only. Best for: analysis, research, summarization. Avoid for tasks needing main conversation history.",
  inputSchema: z.object({
    task: z
      .string()
      .describe(
        "Self-contained task description. Be specific. Sub-agent has NO access to your conversation history.",
      ),
    context: z
      .string()
      .optional()
      .describe(
        "Optional background info the sub-agent needs (e.g. relevant code snippet, prior findings).",
      ),
  }),
  execute: async ({ task, context }) => {
    try {
      const { text } = await generateText({
        model: deepseek.chat(MODEL_DELEGATE),
        system:
          "You are a focused sub-agent in a multi-agent system. Execute the given task and return ONLY the final result. Be concise. No greetings, no meta-commentary about being an AI.",
        prompt: context
          ? `Background context:\n${context}\n\n---\n\nTask: ${task}`
          : task,
      });
      return {
        success: true,
        task,
        result: text,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
