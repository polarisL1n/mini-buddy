import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { safePath } from "../sandbox";

/**
 * write_file — 写入文本文件到沙盒
 * 关键设计：返回 oldContent 和 newContent，UI 层渲染 diff 视图
 */
export const writeFile = tool({
  description:
    "Write or overwrite a text file inside the sandbox workspace. Always reads old content first (if exists) so the UI can render a diff view. Use after read_file to confirm intent.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Relative path inside workspace, e.g. 'src/index.ts'"),
    content: z.string().describe("Full file content to write"),
  }),
  execute: async ({ path: filePath, content }) => {
    try {
      const abs = safePath(filePath);
      let oldContent = "";
      let isNew = true;
      try {
        oldContent = await fs.readFile(abs, "utf-8");
        isNew = false;
      } catch {
        // file did not exist; treat as new
      }
      // ensure parent dir exists
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      return {
        success: true,
        path: filePath,
        isNew,
        oldContent,
        newContent: content,
        oldLines: oldContent.split("\n").length,
        newLines: content.split("\n").length,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});
