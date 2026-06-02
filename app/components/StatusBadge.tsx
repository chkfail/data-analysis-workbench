import { CheckCircle2 } from "lucide-react";
import type { JoinedRow } from "@/app/types";

export function StatusBadge({ status }: { status: JoinedRow["status"] }) {
  if (status === "matched") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-field">
        <CheckCircle2 size={13} />
        命中
      </span>
    );
  }

  return <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">未命中</span>;
}
