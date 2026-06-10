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
    heading: "多表碰撞",
    exportFile: "多表碰撞结果.xlsx",
    exportSheet: "碰撞结果",
  },
  latest: {
    title: "取最新行",
    heading: "取最新行",
    exportFile: "取最新行结果.xlsx",
    exportSheet: "取最新行",
  },
  extract: {
    title: "智能提取",
    heading: "智能提取",
    exportFile: "智能提取结果.xlsx",
    exportSheet: "提取结果",
  },
  dedup: {
    title: "模糊去重",
    heading: "模糊去重",
    exportFile: "模糊去重结果.xlsx",
    exportSheet: "去重结果",
  },
  diff: {
    title: "差异对比",
    heading: "差异对比",
    exportFile: "差异对比结果.xlsx",
    exportSheet: "对比结果",
  },
};
