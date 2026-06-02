import type { ToolMode } from "@/app/types";

export const TOOL_DEFINITIONS: Record<
  ToolMode,
  {
    title: string;
    heading: string;
    exportFile: string;
    exportSheet: string;
  }
> = {
  collision: {
    title: "表格碰撞",
    heading: "表格碰撞研判台",
    exportFile: "表格碰撞结果.xlsx",
    exportSheet: "碰撞结果"
  },
  latest: {
    title: "最新记录",
    heading: "最新记录研判台",
    exportFile: "最新记录结果.xlsx",
    exportSheet: "最新记录"
  }
};
