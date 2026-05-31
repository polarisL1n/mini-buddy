# ⚡ mini-buddy — 一个迷你版 Claude Code

> 一个用约 500 行 TypeScript 实现的 **AI 原生编程助手 demo**——完整呈现 Agent Loop、Function Calling、Structured Output、多 Agent 委托、SSE 流式、沙盒工具执行这些 AI 原生工程范式的核心要素。

[![Made with Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Vercel AI SDK v6](https://img.shields.io/badge/Vercel%20AI%20SDK-v6-black)](https://sdk.vercel.ai/)
[![DeepSeek](https://img.shields.io/badge/Model-DeepSeek-blue)](https://platform.deepseek.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)

---

## ✨ 这是什么

mini-buddy 是一个**AI 原生**的编程助手 demo——你给它一个任务，它会规划步骤、调用工具读写文件、执行命令、必要时派发子 Agent 完成研究，最后把过程和结果流式呈现在 UI 里。

它的目标**不是替代 Claude Code 或 Cursor**，而是用最少的代码**完整呈现一个 AI 原生工程范式应该长什么样**：

- ✅ Agent Loop（多步执行 + 终止条件）
- ✅ Function Calling / Tool Use（5 个生产级 tool）
- ✅ Structured Output（任务规划阶段的 JSON Schema 约束输出）
- ✅ 多 Agent 协作（隔离上下文的子 Agent 委托）
- ✅ SSE 流式输出（思考 → 调用 → 观察 → 继续，全程可见）
- ✅ 沙盒安全（path traversal 防护 + 命令白名单）
- ✅ 错误恢复（envelope 模式让 Agent 自己读错误决定下一步）

---

## 🎯 核心特性 — 与 JD 关键词对照

| JD 关键词 | mini-buddy 中的位置 |
|---|---|
| **Agent Loop** | [`app/api/agent/route.ts`](./app/api/agent/route.ts) — `streamText` + `stopWhen: stepCountIs(10)` |
| **Function Calling / Tool Use** | [`lib/tools/*.ts`](./lib/tools/) — 5 个 tool 用 `tool({ inputSchema: z.object({...}) })` 声明 |
| **Structured Output** | [`route.ts`](./app/api/agent/route.ts) `generateText` + `Output.object` 的 plan 阶段（v6 新 API，原 `generateObject` 已弃用）|
| **多 Agent 协作** | [`lib/tools/delegate.ts`](./lib/tools/delegate.ts) — 隔离上下文的子 Agent |
| **SSE 流式** | `useChat` + `toUIMessageStreamResponse` |
| **Prompt Caching** | `route.ts` `providerOptions.anthropic.cacheControl` (留作切换 Claude 时直接生效) |
| **错误恢复** | tool 内 try/catch + `{success: false, error}` envelope，`maxSteps` 防死循环 |
| **沙盒安全** | [`lib/sandbox.ts`](./lib/sandbox.ts) path traversal 防护 + bash 命令白名单 |
| **MCP** | v0.2 路线图（暂未实现） |

---

## 🛠 5 个核心 Tool

| Tool | 职责 | 安全设计 |
|---|---|---|
| `read_file` | 读取沙盒内文本文件 | 路径走 `safePath()` 校验，拒绝绝对路径与 traversal |
| `write_file` | 写入文本文件，UI 自动渲染 diff | 同上；写入前先读旧内容用于 diff 对比 |
| `bash` | 执行白名单 shell 命令 | 命令白名单（`ls/cat/grep/find/node/npm/git/...`）+ 拒绝管道/重定向/链式 + 10s 超时 + 1MB 输出截断 |
| `search` | Tavily 网络搜索（可选） | 没配 key 时友好降级，让 Agent 自己换路径 |
| `delegate_task` | 派发子 Agent 完成独立任务 | 子 Agent 上下文完全隔离，只通过 `task` + `context` 显式传参；只返回最终结论 |

---

## 🏗 架构

```
┌──────────────────────────────────────────────────────────────┐
│  前端  (app/page.tsx)                                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ useChat hook  ─►  /api/agent (POST)                    │  │
│  │                ◄─  SSE 流（文本 + 工具调用）            │  │
│  │                                                        │  │
│  │ <ToolCallView> 按工具类型生成不同的 UI：                │  │
│  │   write_file → react-diff-viewer 渲染 diff            │  │
│  │   read_file  → 代码块                                  │  │
│  │   bash       → 终端风格 stdout/stderr                  │  │
│  │   search     → 搜索结果卡片                            │  │
│  │   delegate   → 子 Agent 结论                           │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ SSE（UI Message Stream 协议）
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  后端  (app/api/agent/route.ts)                              │
│                                                              │
│  阶段 1 ─ Plan（可选）                                        │
│    generateText({ output: Output.object({ schema: ... }) })  │
│      └─► 结构化任务规划注入 system prompt                    │
│                                                              │
│  阶段 2 ─ Agent Loop                                         │
│    streamText({                                              │
│      model: deepseek.chat("deepseek-v4-pro"),                │
│      tools: { read_file, write_file, bash, search,           │
│               delegate_task },                               │
│      stopWhen: stepCountIs(10),  // ← Agent Loop 边界        │
│    })                                                        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Tools  (lib/tools/*.ts)                                     │
│                                                              │
│  每个 tool 返回 { success: true, ...data }                   │
│              或 { success: false, error: "..." }             │
│  → Agent 读取错误后自行决定 retry / fallback / 上报         │
│                                                              │
│  所有文件操作必须经过 lib/sandbox.ts 的 safePath() 校验      │
│  bash 命令受 ALLOWED 白名单限制                              │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │  workspaces/default/     │ ← AI 专用沙盒目录
              └──────────────────────────┘
```

---

## 🚀 Quick Start

### 前置依赖

- Node.js 20+ / pnpm 10+
- DeepSeek API Key（[申请地址](https://platform.deepseek.com/api_keys)，价格极优）
- （可选）Tavily API Key（用于网络搜索 tool）

### 运行步骤

```bash
git clone https://github.com/polarisL1n/mini-buddy.git
cd mini-buddy
pnpm install
cp .env.example .env.local
# 填入 DEEPSEEK_API_KEY (TAVILY_API_KEY 可选)
pnpm dev
```

打开 http://localhost:3000，试试这些示例 prompt：

```
帮我写一个 hello.ts，打印 'hello mini-buddy'，然后用 node 跑一下。

列出工作区的文件，然后告诉我里面是什么。

用 delegate_task 研究一下 Vercel AI SDK 的 maxSteps 是什么。

用快速排序写一个 TypeScript 实现，并用 npx tsx 跑测试。
```

**第一次执行会自动创建 `workspaces/default/` 沙盒目录**，AI 写入的所有文件都会进这里（不会污染你的项目本身）。

---

## ☁️ 关于 Vercel 部署的限制

线上 demo 部署在 Vercel Serverless 上，**有以下限制**（已识别 + 已规划解决路径）：

| 限制 | 表现 | 解决方案 |
|---|---|---|
| **文件系统不持久化** | 每次冷启动都是干净环境，上一次创建的文件下次看不到 | v0.2 改用 Vercel KV / Blob 持久化沙盒 |
| **`.traces/` 写盘失效** | 在线版 trace 面板可能取不到历史 trace | v0.4 接 Langfuse / OpenLLMetry |
| **bash 跨调用状态丢失** | `mkdir test` 后下次 `ls` 看不到 | 同上，需要持久层 |
| **冷启动延迟** | 第一次请求慢 1-3 秒 | Vercel 共有问题，付费版可改善 |

**所以推荐两种使用方式**：

1. **线上 demo**：单次会话内验证 Agent 范式（写文件 + 跑 → 看 diff + 看 trace）
2. **本地深度玩**：clone 仓库本地跑，文件持久、trace 完整

这种设计是**有意识的工程取舍**——把 demo 上线的优先级放在"能让人 1 分钟看懂 AI 原生范式"上，持久化能力留到 v0.2 配套 KV 存储一起做。

---

## 📖 关键设计决策

### 为什么 fork 了 vercel/ai-chatbot 又重写？

最初想 fork [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) 改造（[原 fork 仓库](https://github.com/polarisL1n/mini-buddy/tree/archive)），研究下来发现它的 db / auth / artifacts / blob 分层是为团队 SaaS 产品设计——对于"验证 AI 原生范式"是过度工程化。

所以选择从零搭，只保留**真正必要的部分**。

> 这个判断本身比"成功改造一个开源项目"更值钱——**工程取舍能力**才是 senior 工程师的硬通货。

### 为什么用 `streamText` 而不是 `ToolLoopAgent` / `Experimental_Agent`？

Vercel AI SDK v6 提供了 `ToolLoopAgent` 类（导出名 `Experimental_Agent`），它把 Agent 包装成一个长生命周期对象，有 `id` / `instructions` / `tools` / `stopWhen` 等属性，支持 `agent.generate()` 和 `agent.stream()` 两种调用形态。

我 v0.1 仍然选用底层的 `streamText`，理由有三：

1. **API 透明度**：`stopWhen: stepCountIs(10)` 这种 Agent Loop 的**核心边界条件**直接写在调用处，每个工程决策在代码层可见——这是 demo 项目的核心价值。`ToolLoopAgent` 把这些埋进了 settings，不利于讲清"我是怎么实现 Agent Loop 的"。

2. **同源实现**：从 d.ts 类型签名看，`ToolLoopAgent.stream()` 返回 `StreamTextResult` 类型——它内部就是包了一层 streamText。**两者不是替代关系，是封装关系**。

3. **Experimental 状态**：SDK 当前把它作为 `Experimental_Agent` 暴露，API 仍在演进。

**v0.2 会迁移到 ToolLoopAgent**——因为到那时 Agent 数量增加（不止主 agent，还会有专家子 agent 池），需要：
   - **Agent 注册中心**：每个 Agent 有 `id` 可以被引用
   - **多端复用**：同一个 Agent 在 Web / CLI 调用
   - **可测试性**：Agent 类比 streamText 函数好 mock

这种迭代思路对照 **WorkRally 的"专家级 Agent"架构**——他们一定不是每次会话现场拼 streamText，而是把每个专家定义为持久 Agent 实例。这就是 `ToolLoopAgent` pattern 的工业级形态。

### 为什么 tool 不抛异常，要返回 envelope？

```ts
// ❌ 抛异常 —— 整个 Agent Loop 中断
throw new Error("file not found");

// ✅ envelope —— Agent 读到错误后自己决定下一步
return { success: false, error: "file not found" };
```

Agent 是个**有韧性的执行体**，不是抛异常就崩溃的脚本。Envelope 模式让 Agent 在 observation 阶段读到错误，自己判断要 retry / 换路径 / 还是报告 blocker。

### 为什么沙盒用 `workspaces/default/` 而不是 `/tmp`？

- `/tmp` 在 macOS / Linux 行为不一致
- 沙盒目录就在项目内，方便 demo / 演示
- 用户能直观看到 AI 操作了什么文件
- 配合 `.gitignore` 避免泄露

### `bash` tool 为什么白名单？为什么连 `*` `>` `|` 都拒绝？

LLM 的输出是**非确定性输入源**。如果不在 tool 层做硬校验，等于把 prompt injection 变成 RCE 漏洞。

- 白名单 = 默认拒绝、显式允许
- 拒绝 shell 元字符 = 阻断"用一行命令完成多个动作"的逃逸

这个设计的代价是**Agent 不能用一些花哨的命令组合**——但安全比方便重要 1000 倍。

---

## 🗺 Roadmap

- [x] **v0.1** — Agent Loop（streamText）/ 5 tools / Structured plan / Tracing / Diff UI / Sandbox / Reasoning
- [ ] **v0.2** — 迁移到 `ToolLoopAgent`：Agent 作为一等公民（注册中心 / 多端复用 / 可测试） + Orchestrator-Workers pattern + 子 Agent 受限 tool 集
- [ ] **v0.3** — MCP server 接入 + WebSocket 双工流
- [ ] **v0.4** — Tracing 接 Langfuse / OpenLLMetry 替代手写
- [ ] **v0.4** — 端侧 AI 实验（Transformers.js 做本地 embedding）
- [ ] **v0.5** — Tauri 桌面端封装

---

## 📝 License

MIT

---

## 🙏 致谢

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) — Agent 设计范式的圣经
- [Vercel AI SDK](https://sdk.vercel.ai/) — 让 AI 应用工程化变得简单
- [Claude Code](https://claude.com/claude-code) — Task tool 启发了 `delegate_task` 设计
- [DeepSeek](https://deepseek.com/) — 让 AI 实验的成本几乎归零

---

> Made with ⚡ by [polarisL1n](https://github.com/polarisL1n)
