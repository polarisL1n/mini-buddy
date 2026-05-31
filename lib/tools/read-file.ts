import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import { safePath } from "../sandbox";

/**
 * read_file — 读取沙盒内的文本文件
 * 设计：返回 envelope { success, ... } 让 Agent 自己处理失败，不抛异常
 */
export const readFile = tool({
  description:
    "Read a text file inside the sandbox workspace. Returns file content as string. Use this to inspect existing code/docs before modifying.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Relative path inside workspace, e.g. 'src/index.ts'"),
  }),
  execute: async ({ path: filePath }) => {
    try {
      const abs = safePath(filePath);
      const content = await fs.readFile(abs, "utf-8");
      const lines = content.split("\n").length;
      return {
        success: true,
        path: filePath,
        content,
        lines,
        bytes: Buffer.byteLength(content, "utf-8"),
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
