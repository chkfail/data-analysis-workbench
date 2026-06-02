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
    title: "两表碰撞",
    heading: "两表碰撞研判台",
    exportFile: "两表碰撞结果.xlsx",
    exportSheet: "碰撞结果"
  },
  latest: {
    title: "取最新行",
    heading: "取最新行研判台",
    exportFile: "取最新行结果.xlsx",
    exportSheet: "取最新行"
  }
};
