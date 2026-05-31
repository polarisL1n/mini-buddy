/**
 * 通用错误渲染：tool envelope 失败 ({success: false}) 时显示
 */
export function ErrorRenderer({ error }: { error: string }) {
  return (
    <div className="text-xs text-[var(--error)] font-mono">error: {error}</div>
  );
}
