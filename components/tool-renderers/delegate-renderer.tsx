interface DelegateOutput {
  task?: string;
  result?: string;
}

/**
 * delegate_task 输出渲染：子 Agent 任务 + 结果
 */
export function DelegateRenderer({ output }: { output: DelegateOutput }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="text-zinc-400">🤝 sub-agent task: {output.task}</div>
      <div className="bg-black/40 p-2 rounded whitespace-pre-wrap leading-relaxed">
        {output.result}
      </div>
    </div>
  );
}
