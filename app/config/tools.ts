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
    title: "多表碰撞",
    heading: "多表碰撞研判台",
    exportFile: "多表碰撞结果.xlsx",
    exportSheet: "碰撞结果"
  },
  latest: {
    title: "取最新行",
    heading: "取最新行研判台",
    exportFile: "取最新行结果.xlsx",
    exportSheet: "取最新行"
  },
  extract: {
    title: "智能提取",
    heading: "智能提取研判台",
    exportFile: "智能提取结果.xlsx",
    exportSheet: "提取结果"
  }
};
