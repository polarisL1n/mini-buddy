/**
 * Tool 输出渲染器路由
 *
 * 按 tool name 分发到具体渲染器；未知 tool 走 fallback 直接 JSON.stringify。
 *
 * 这里集中导出 + 路由，让 ToolCallView 不需要知道具体实现。
 */
import { BashRenderer } from "./bash-renderer";
import { DelegateRenderer } from "./delegate-renderer";
import { ErrorRenderer } from "./error-renderer";
import { FallbackRenderer } from "./fallback-renderer";
import { ReadFileRenderer } from "./read-file-renderer";
import { SearchRenderer } from "./search-renderer";
import { WriteFileRenderer } from "./write-file-renderer";

interface ToolOutputProps {
  toolName: string;
  output: Record<string, unknown>;
}

export function ToolOutputRouter({ toolName, output }: ToolOutputProps) {
  // 错误统一处理
  if (output.success === false) {
    return <ErrorRenderer error={String(output.error)} />;
  }

  switch (toolName) {
    case "write_file":
      return <WriteFileRenderer output={output} />;
    case "read_file":
      return <ReadFileRenderer output={output} />;
    case "bash":
      return <BashRenderer output={output} />;
    case "search":
      return <SearchRenderer output={output} />;
    case "delegate_task":
      return <DelegateRenderer output={output} />;
    default:
      return <FallbackRenderer output={output} />;
  }
}
