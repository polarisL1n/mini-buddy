/**
 * 5 个核心 tool：read_file / write_file / bash / search / delegate_task
 *
 * 设计原则：
 *  - 命名空间扁平（不嵌套，方便 LLM 理解）
 *  - 错误用 envelope 不抛异常（让 Agent 自己读错误决定下一步）
 *  - 描述清晰（LLM 选 tool 的关键依据是 description）
 *  - 输入用 zod schema 强校验（防止 prompt injection 注 garbage 参数）
 */
export { readFile } from "./read-file";
export { writeFile } from "./write-file";
export { bash } from "./bash";
export { search } from "./search";
export { delegateTask } from "./delegate";

import { readFile } from "./read-file";
import { writeFile } from "./write-file";
import { bash } from "./bash";
import { search } from "./search";
import { delegateTask } from "./delegate";

/** 暴露给 streamText 的 tools map（key 即 LLM 看到的 function name） */
export const allTools = {
  read_file: readFile,
  write_file: writeFile,
  bash,
  search,
  delegate_task: delegateTask,
} as const;

export type ToolName = keyof typeof allTools;
