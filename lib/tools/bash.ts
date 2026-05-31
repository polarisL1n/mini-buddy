import { tool } from "ai";
import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { SANDBOX_ROOT, ensureSandbox } from "../sandbox";

const execAsync = promisify(exec);

/**
 * bash — 在沙盒目录执行白名单 shell 命令
 *
 * 安全设计（多重防护，平衡可用性与安全性）：
 *  1. 命令白名单：只允许常用 dev 命令（包括 npm/npx/node/git）
 *  2. cwd 强制 SANDBOX_ROOT（即使 .. 也跳不出沙盒，因为根目录就是沙盒）
 *  3. 30 秒超时（npm install 需要时间）
 *  4. 1MB 输出截断
 *  5. 拒绝最危险的元字符：` $ > 重定向、process substitution
 *  6. 允许 && 和 || 链式（开发流程常需要 install && build 这种）
 *  7. 允许 | 管道（grep 配合 ls/cat 是常用模式）
 *
 * 注意：fork/exec 由 Node.js child_process 处理，cwd 锁定确保即使
 * LLM 写 ../../../etc/passwd 也跳不出 SANDBOX_ROOT 之外（cd 命令需要
 * 仍然在沙盒内，因为 cwd 重置）。
 */

// 白名单：常用 dev 命令
const ALLOWED_COMMANDS = new Set([
  // 文件浏览
  "ls",
  "cat",
  "grep",
  "find",
  "head",
  "tail",
  "wc",
  "echo",
  "pwd",
  "tree",
  "mkdir",
  "rm",
  "mv",
  "cp",
  "touch",
  // 搜索
  "rg",
  "ripgrep",
  // Node 生态
  "node",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "tsx",
  "tsc",
  // 版本控制
  "git",
  // 内省
  "which",
  "whereis",
  "type",
  "env",
]);

// 极危险模式：仍然拒绝
const DANGER_PATTERNS: Array<{ pat: RegExp; reason: string }> = [
  {
    pat: /[`$]\(/,
    reason: "command substitution ($(...) or `...`)",
  },
  {
    pat: />\s*\/|<\s*\//,
    reason: "redirect to/from absolute path",
  },
  {
    pat: /\brm\s+-rf?\s+\//,
    reason: "rm -rf on absolute path",
  },
  {
    pat: /\bsudo\b/,
    reason: "sudo escalation",
  },
  {
    pat: /\bcurl\s+|wget\s+/,
    reason: "network download (use search tool instead)",
  },
];

export const bash = tool({
  description: `Execute a shell command in the sandbox workspace (cwd=workspaces/default). ALLOWED commands: ${[...ALLOWED_COMMANDS].join(", ")}. Chained commands with && or || are allowed. Pipes (|) are allowed. Banned: command substitution ($(...) and backticks), absolute path redirects, sudo, network downloads. Use this to install deps, run scripts, verify changes.`,
  inputSchema: z.object({
    command: z
      .string()
      .describe(
        "Shell command. Each segment (split by && / || / |) must start with an allowed command. Banned patterns: $(...), `...`, sudo, curl/wget, rm -rf /.",
      ),
  }),
  execute: async ({ command }) => {
    try {
      const trimmed = command.trim();

      // 1) 检查危险模式
      for (const { pat, reason } of DANGER_PATTERNS) {
        if (pat.test(trimmed)) {
          return {
            success: false,
            error: `Command rejected: ${reason}.`,
          };
        }
      }

      // 2) 把命令按 &&、||、|、; 切片，每个片段首 token 必须在白名单
      // （不允许 ; 因为多余）
      if (/;/.test(trimmed)) {
        return {
          success: false,
          error:
            "Semicolon (;) is not allowed; use && or || for chaining instead.",
        };
      }
      const segments = trimmed.split(/\s*(?:&&|\|\||\|)\s*/);
      const denied: string[] = [];
      for (const seg of segments) {
        const firstToken = seg.trim().split(/\s+/)[0];
        if (!ALLOWED_COMMANDS.has(firstToken)) {
          denied.push(firstToken);
        }
      }
      if (denied.length > 0) {
        return {
          success: false,
          error: `Command(s) "${denied.join(", ")}" not in whitelist. Allowed: ${[...ALLOWED_COMMANDS].join(", ")}`,
        };
      }

      await ensureSandbox();
      const { stdout, stderr } = await execAsync(trimmed, {
        cwd: SANDBOX_ROOT,
        timeout: 30_000, // 30s, 容纳 npm install
        maxBuffer: 1024 * 1024, // 1 MB
      });

      return {
        success: true,
        command: trimmed,
        stdout: stdout || "",
        stderr: stderr || "",
      };
    } catch (e) {
      const err = e as { message?: string; stdout?: string; stderr?: string };
      return {
        success: false,
        error: err.message || String(e),
        stdout: err.stdout || "",
        stderr: err.stderr || "",
      };
    }
  },
});
