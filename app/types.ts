export type ToolMode =
  | "collision"
  | "latest"
  | "extract"
  | "dedup"
  | "diff"
  | "search"
  | "merge";
export type MatchMode = "complete" | "collision";
export type DiffMode = "keyed" | "unkeyed";
export type DiffRowStatus = "added" | "deleted" | "modified" | "unchanged";
export type TableSlot =
  | "latest"
  | "extract"
  | "dedup"
  | "diff-old"
  | "diff-new"
  | "merge-base"
  | `search-${string}`
  | `collision-${string}`
  | `merge-${string}`;
export type CellValue = string | number | boolean | null;
export type DataRow = Record<string, CellValue>;

export type WorkbookState = {
  name: string;
  /** 按表头行生成的数据行 */
  sheets: Record<string, DataRow[]>;
  /** 原始二维数组，用于切换表头行时重建 sheets */
  raw: Record<string, CellValue[][]>;
  /** 每个工作表的表头行（1 起计，对应 Excel 行号） */
  headerRows: Record<string, number>;
  activeSheet: string;
};

export type OutputRow = {
  id: string;
  data: Record<string, string>;
};

export type JoinedRow = OutputRow & {
  status: "matched" | "left-only";
};

export type DiffRow = OutputRow & {
  diffStatus: DiffRowStatus;
  changedFields: string[];
};

export type CollisionTableState = {
  id: TableSlot;
  title: string;
  workbook: WorkbookState | null;
  field: string;
};

export type CollisionTableRuntime = CollisionTableState & {
  rows: DataRow[];
  columns: string[];
};

export type SearchTableState = {
  id: TableSlot;
  title: string;
  workbook: WorkbookState | null;
  selectedSheets: string[];
};

export type SearchTableRuntime = SearchTableState & {
  selectedRowCount: number;
};

export type MergeTableState = {
  id: TableSlot;
  title: string;
  workbook: WorkbookState | null;
};

export type MergeTableRuntime = MergeTableState & {
  rows: DataRow[];
  columns: string[];
};

export type MergeFieldMapping = Record<string, string>;

export type MetricTuple = [label: string, value: number, unit?: string];
