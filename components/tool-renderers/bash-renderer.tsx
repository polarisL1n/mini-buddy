interface BashOutput {
  command?: string;
  stdout?: string;
  stderr?: string;
}

/**
 * bash 输出渲染：终端风格，stdout/stderr 分色
 */
export function BashRenderer({ output }: { output: BashOutput }) {
  return (
    <div className="space-y-1 font-mono text-xs">
      <div className="text-zinc-500">$ {output.command}</div>
      {output.stdout ? (
        <pre className="bg-black/40 p-2 rounded overflow-x-auto max-h-60">
          {output.stdout}
        </pre>
      ) : null}
      {output.stderr ? (
        <pre className="bg-red-950/30 p-2 rounded overflow-x-auto text-red-300">
          {output.stderr}
        </pre>
      ) : null}
    </div>
  );
}
