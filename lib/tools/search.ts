import { tool } from "ai";
import { z } from "zod";

/**
 * search — 网络搜索（可选，需要 TAVILY_API_KEY）
 * 没配 key 时返回温和的提示信息，Agent 可以决定换路径
 *
 * Tavily 免费额度：1000 次/月，注册：https://tavily.com/
 */
export const search = tool({
  description:
    "Search the web for up-to-date information. Returns top 5 results with URL/title/content snippet. Use when task requires current info beyond the model's training data.",
  inputSchema: z.object({
    query: z.string().describe("Concise search query, like Google search"),
  }),
  execute: async ({ query }) => {
    if (!process.env.TAVILY_API_KEY) {
      return {
        success: false,
        error:
          "TAVILY_API_KEY not configured. Search tool is disabled in this environment.",
        hint: "You can complete the task without web search, or ask the user to provide info.",
      };
    }
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: 5,
          search_depth: "basic",
        }),
        // 8 秒超时
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return {
          success: false,
          error: `Tavily HTTP ${res.status}: ${res.statusText}`,
        };
      }
      const data = (await res.json()) as {
        results?: Array<{ url: string; title: string; content: string }>;
      };
      return {
        success: true,
        query,
        results: data.results ?? [],
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
