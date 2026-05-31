"use client";
import dynamic from "next/dynamic";

// react-diff-viewer 是 client-only，dynamic import 防止 SSR 报错
const ReactDiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
});

interface WriteFileOutput {
  path?: string;
  isNew?: boolean;
  oldContent?: string;
  newContent?: string;
  oldLines?: number;
  newLines?: number;
}

/**
 * write_file 输出渲染：新文件直接展示，修改文件用 diff
 */
export function WriteFileRenderer({ output }: { output: WriteFileOutput }) {
  const oldContent = output.oldContent ?? "";
  const newContent = output.newContent ?? "";
  const isNew = output.isNew ?? !oldContent;

  return (
    <div className="space-y-1">
      <div className="text-xs text-zinc-400">
        {isNew ? "📝 new file" : "✏ modified"}: {output.path}
        <span className="ml-2 text-zinc-500">
          ({output.oldLines} → {output.newLines} lines)
        </span>
      </div>
      {isNew ? (
        <pre className="text-xs bg-black/40 p-2 rounded overflow-x-auto max-h-80">
          {newContent}
        </pre>
      ) : (
        <div className="text-xs">
          <ReactDiffViewer
            oldValue={oldContent}
            newValue={newContent}
            splitView={false}
            useDarkTheme
            hideLineNumbers={false}
          />
        </div>
      )}
    </div>
  );
}
