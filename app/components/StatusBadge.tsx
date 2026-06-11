import { CheckCircle2 } from "lucide-react";
import type { JoinedRow } from "@/app/types";

export function StatusBadge({ status }: { status: JoinedRow["status"] }) {
  if (status === "matched") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-field-soft px-2.5 py-1 text-xs font-bold text-field ring-1 ring-inset ring-field/15">
        <CheckCircle2 size={13} />
        命中
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200/60">
      未命中
    </span>
  );
}
