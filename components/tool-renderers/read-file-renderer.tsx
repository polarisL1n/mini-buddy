interface ReadFileOutput {
  path?: string;
  lines?: number;
  content?: string;
}

/**
 * read_file 输出渲染：路径 + 行数 + 文件内容
 */
export function ReadFileRenderer({ output }: { output: ReadFileOutput }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-zinc-400">
        {output.path} · {output.lines} lines
      </div>
      <pre className="text-xs bg-black/40 p-2 rounded overflow-x-auto max-h-80 whitespace-pre">
        {output.content}
      </pre>
    </div>
  );
}
