/**
 * 空状态提示 — 第一次进入 / 没有消息时给用户一组示例 prompt
 */
const SAMPLES = [
  "Create a workspaces/default/hello.ts that prints 'hello mini-buddy', then run it with node.",
  "List files in the workspace, then summarize what's there.",
  "Use delegate_task to research what 'Vercel AI SDK maxSteps' means.",
  "Write a fibonacci function in fib.ts and verify with bash.",
];

export function EmptyHint() {
  return (
    <div className="space-y-3 text-sm text-zinc-400 pt-8">
      <p className="text-zinc-300 font-medium">Try one of these:</p>
      {SAMPLES.map((s) => (
        <p key={s} className="font-mono text-xs leading-relaxed">
          ▸ {s}
        </p>
      ))}
    </div>
  );
}
