/**
 * 兜底渲染：未知 tool 或 schema 不匹配时直接 dump JSON
 */
export function FallbackRenderer({ output }: { output: unknown }) {
  return (
    <pre className="text-xs bg-black/40 p-2 rounded overflow-x-auto">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}
