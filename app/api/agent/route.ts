import {
  streamText,
  generateText,
  Output,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { deepseek, MODEL_AGENT, MODEL_PLAN } from "@/lib/ai-provider";
import { allTools } from "@/lib/tools";
import { ensureSandbox } from "@/lib/sandbox";
import {
  appendStep,
  createTrace,
  finalizeTrace,
  persistTrace,
  printTrace,
  type Trace,
} from "@/lib/tracing";

export const maxDuration = 60;

/**
 * Agent Loop 核心路由
 *
 * 流程：
 *   1. (可选) Plan 阶段 — generateText + Output.object 输出结构化任务规划
 *   2. Agent Loop — streamText + tools + stepCountIs(10) 防死循环
 *   3. SSE 流式回前端 + Trace 记录
 *
 * 集齐 JD 关键词：
 *   - Agent Loop ✓ (stepCountIs)
 *   - Function Calling / Tool Use ✓ (allTools)
 *   - Structured Output ✓ (generateText + Output.object — v6 新 API)
 *   - SSE 流式 ✓ (toUIMessageStreamResponse)
 *   - 多 Agent ✓ (delegate_task tool)
 *   - 错误恢复 ✓ (tool envelope + onStepFinish 累积失败计数)
 *   - 可观察性 ✓ (Trace 记录每个 step + 持久化到 .traces/)
 *   - Prompt Caching ✓ (Anthropic providerOptions，DeepSeek 暂不支持但留着)
 *
 * v6 API 变更：
 *   `generateObject` 已弃用，迁移到 `generateText({ output: Output.object({schema}) })`。
 *   理由：让"生成 JSON" 和 "生成文本"统一在 generateText 里，可以共享 reasoning / tool 等通用能力。
 */
export async function POST(req: Request) {
  await ensureSandbox();

  const { messages, enablePlan } = (await req.json()) as {
    messages: UIMessage[];
    enablePlan?: boolean;
  };

  const lastUser = messages.findLast((m) => m.role === "user");
  const userText = JSON.stringify(lastUser?.parts ?? lastUser);

  // === 阶段 1：Plan（Structured Output 演示）===
  let plan: string[] | null = null;
  const isFirstTurn = messages.filter((m) => m.role === "user").length === 1;

  if (enablePlan && isFirstTurn) {
    try {
      // v6 API: generateText + Output.object 替代了已弃用的 generateObject
      // 优势：plan 阶段也能用同一套 reasoning / providerOptions / 模型切换逻辑
      const { output } = await generateText({
        model: deepseek.chat(MODEL_PLAN),
        output: Output.object({
          schema: z.object({
            steps: z
              .array(z.string())
              .min(1)
              .max(7)
              .describe("Concrete actionable steps to complete the task"),
          }),
        }),
        prompt: `You are a planning assistant. Break this user request into 3-7 concrete steps.\n\nUser request:\n${userText}\n\nReturn a JSON with "steps" array.`,
      });
      plan = output.steps;
    } catch (err) {
      console.warn("[plan] structured output failed, skipping plan", err);
    }
  }

  // === Trace 初始化 ===
  const trace: Trace = createTrace({ userMessage: userText, plan });
  console.log(`\n[trace] start ${trace.traceId} · plan=${!!plan}`);

  // === 阶段 2：Agent Loop ===
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: deepseek.chat(MODEL_AGENT),
    system: buildSystemPrompt(plan),
    messages: modelMessages,
    tools: allTools,
    // Agent Loop 边界：最多 10 步（防死循环 / 防爆账单）
    stopWhen: stepCountIs(10),
    providerOptions: {
      // Anthropic 缓存（切到 Claude 自动生效）
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
    onStepFinish: ({ toolCalls, toolResults, finishReason, text }) => {
      const stepStartedAt = Date.now() - 1; // 近似（更精确需要 onStepStart）
      appendStep(trace, {
        startedAt: stepStartedAt,
        toolCalls: toolCalls as never,
        toolResults: toolResults as never,
        finishReason,
        text,
      });

      // 控制台打印每一步
      const tools = toolCalls?.map((t) => t.toolName).join(", ") || "-";
      const fails =
        toolResults?.filter((r) => {
          const o = r.output as { success?: boolean } | undefined;
          return o?.success === false;
        }).length ?? 0;
      console.log(
        `[trace ${trace.traceId}] #${trace.steps.length - 1} [${finishReason}] ${tools}${fails ? ` ✗${fails}` : ""}`,
      );

      // ⚠️ 软停止信号：连续失败 ≥3 次时打印警告
      // （SDK 不允许动态注入 system，但 system prompt 已写明 "3 次失败应停止"）
      if (trace.consecutiveFailures >= 3) {
        console.warn(
          `[trace ${trace.traceId}] ⚠ consecutive failures=${trace.consecutiveFailures}, agent should stop and report.`,
        );
      }
    },
    onFinish: async ({ finishReason }) => {
      finalizeTrace(trace, finishReason);
      printTrace(trace);
      const file = await persistTrace(trace);
      if (file) {
        console.log(`[trace ${trace.traceId}] persisted to ${file}\n`);
      }
    },
    onError: ({ error }) => {
      console.error("[agent stream error]", error);
    },
  });

  // 把 plan + traceId 通过 response header 透传给前端
  // sendReasoning 默认 true（这里显式声明强调）— v4-pro 等推理模型的 thinking
  // 会作为 reasoning UIPart 透传给前端，前端可以单独渲染折叠的"思考过程"
  const response = result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
  response.headers.set("X-Trace-Id", trace.traceId);
  if (plan) {
    response.headers.set("X-Agent-Plan", JSON.stringify(plan));
  }
  return response;
}

function buildSystemPrompt(plan: string[] | null): string {
  return `You are mini-buddy, an AI coding assistant agent.
Always respond in Chinese (中文回复用户).

You have 5 tools at your disposal:
- **read_file**: Read text files in the workspace sandbox
- **write_file**: Write/overwrite text files (the UI will render a diff)
- **bash**: Run whitelisted shell commands in the sandbox (cwd=workspaces/default; allows && || | chains)
- **search**: Web search (only if you need current info beyond training data)
- **delegate_task**: Spin up an isolated sub-agent for an independent sub-task

Working principles:
1. **Understand first**: If the task is ambiguous, ask. Don't guess.
2. **Inspect before mutating**: Use read_file / bash(ls,cat) before write_file.
3. **Verify after writing**: Use bash to confirm the changes (ls / cat / npm test).
4. **Narrate your reasoning**: Briefly explain WHY you chose this step.

5. **Error recovery — IMPORTANT**:
   Tool failures return { success: false, error: "..." }. Read the error carefully.
   - If error suggests **wrong syntax/args**, fix and retry ONCE.
   - If error suggests **environment/permission issue** (e.g. command not in whitelist, missing dependency, network blocked), DO NOT retry the same approach 3+ times. Instead, **STOP and tell the user in clear Chinese what went wrong and ask them to check / fix / approve**. Always end with concrete next-step suggestions.
   - **Never silently keep retrying**. If you have failed the same kind of operation 3 times in a row, switch to "report and ask" mode immediately.

6. **When stopping is the right answer**: Sometimes the best action is to ask the user. If you cannot make progress, say so explicitly and propose options. Do not waste tool calls retrying broken environments.

7. **Use delegate_task sparingly**: Only for truly independent sub-tasks (analysis, research). Don't use it as a fancy way to call yourself.

Sandbox: All file ops are confined to \`workspaces/default/\`. Path traversal is blocked at the tool layer.

${plan ? `\nPlanned steps for this task:\n${plan.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}\n\nFollow this plan unless you discover it's wrong, in which case explain and adapt.` : ""}
`;
}
