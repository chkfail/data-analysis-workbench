export type ToolMode = "collision" | "latest";
export type MatchMode = "complete" | "collision";
export type TableSlot = "latest" | `collision-${string}`;
export type DataRow = Record<string, string | number | boolean | null>;

export type WorkbookState = {
  name: string;
  sheets: Record<string, DataRow[]>;
  activeSheet: string;
};

export type OutputRow = {
  id: string;
  data: Record<string, string>;
};

export type JoinedRow = OutputRow & {
  status: "matched" | "left-only";
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

export type MetricTuple = [label: string, value: number];
