/**
 * 沙盒安全模块
 * - 所有文件操作必须经过 safePath() 校验，防止 path traversal 攻击
 * - bash 执行限定 cwd 在 SANDBOX_ROOT 下
 *
 * 设计哲学：
 *   LLM 是非确定性输入源，可能产生 "../../etc/passwd" 这种参数。
 *   不在调用层做硬校验 = 把整个文件系统当礼物送给 prompt injection。
 *
 * 部署环境兼容：
 *   - 本地开发：沙盒在项目根的 workspaces/default/（可持久）
 *   - Vercel Serverless：process.cwd() 指向只读 /var/task，必须用 /tmp（单次调用持久）
 */
import path from "node:path";
import fs from "node:fs/promises";

// Vercel serverless 环境下 fs 只读，必须 fallback 到 /tmp
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export const SANDBOX_ROOT = isServerless
  ? "/tmp/mini-buddy/workspaces/default"
  : path.resolve(process.cwd(), "workspaces", "default");

/** 确保沙盒根目录存在 */
export async function ensureSandbox() {
  await fs.mkdir(SANDBOX_ROOT, { recursive: true });
}

/**
 * 解析用户给的相对路径到沙盒内的绝对路径，并校验未越界
 * @throws 如果解析后路径不在 SANDBOX_ROOT 内
 */
export function safePath(userPath: string): string {
  // 拒绝绝对路径（无论指向哪都不允许）
  if (path.isAbsolute(userPath)) {
    throw new Error(`Absolute path is not allowed: ${userPath}`);
  }
  const resolved = path.resolve(SANDBOX_ROOT, userPath);
  if (!resolved.startsWith(SANDBOX_ROOT + path.sep) && resolved !== SANDBOX_ROOT) {
    throw new Error(`Path traversal detected: ${userPath} -> ${resolved}`);
  }
  return resolved;
}

/** 把绝对路径转回沙盒内相对路径，用于显示 */
export function relPath(absPath: string): string {
  return path.relative(SANDBOX_ROOT, absPath) || ".";
}
