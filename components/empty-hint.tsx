/**
 * 空状态提示 — 第一次进入 / 没有消息时给用户一组示例 prompt
 *
 * 设计考量：示例 prompt 用中文（给用户看的），但每条都精心挑选能演示
 * 一个核心能力——分别覆盖 write+bash / read+总结 / delegate_task / 复杂多步。
 */
const SAMPLES = [
  "帮我写一个 hello.ts，打印 'hello mini-buddy'，然后用 node 跑一下。",
  "列出工作区的文件，然后告诉我里面是什么。",
  "用 delegate_task 研究一下 Vercel AI SDK 的 maxSteps 是什么。",
  "用快速排序写一个 TypeScript 实现，并用 npx tsx 跑测试。",
];

export function EmptyHint() {
  return (
    <div className="space-y-3 text-sm text-zinc-400 pt-8">
      <p className="text-zinc-300 font-medium">试试这些示例：</p>
      {SAMPLES.map((s) => (
        <p key={s} className="font-mono text-xs leading-relaxed">
          ▸ {s}
        </p>
      ))}
    </div>
  );
}
