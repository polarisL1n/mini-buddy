import fs from "node:fs/promises";
import path from "node:path";

// 部署环境兼容：与 lib/tracing.ts 保持一致
const isServerless =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const TRACES_DIR = isServerless
  ? "/tmp/mini-buddy/.traces"
  : path.resolve(process.cwd(), ".traces");

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  // 防止路径注入：traceId 必须是 nanoid 格式（字母数字 + - + _）
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid trace id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const file = path.join(TRACES_DIR, `${id}.json`);
    const content = await fs.readFile(file, "utf-8");
    return new Response(content, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Trace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
