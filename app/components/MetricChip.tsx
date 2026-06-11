import { CheckCircle2, Hash, TriangleAlert } from "lucide-react";

export function MetricChip({ label, value, unit }: { label: string; value: number; unit?: string }) {
  const tone = getMetricTone(label);

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone.className}`}>
      {tone.icon}
      {label}
      <span>
        <strong className={`font-mono ${tone.valueClassName}`}>{value.toLocaleString("zh-CN")}</strong>
        {unit ? <span className={tone.unitClassName}> {unit}</span> : null}
      </span>
    </span>
  );
}

function getMetricTone(label: string) {
  if (label.includes("未命中") || label.includes("忽略") || label.includes("删除")) {
    return {
      className: "bg-amber-50 text-amber-700 ring-amber-200/70",
      valueClassName: "text-amber-900",
      unitClassName: "text-amber-700",
      icon: <TriangleAlert size={13} />,
    };
  }

  if (label.includes("命中") || label.includes("提取") || label.includes("新增") || label.includes("推荐")) {
    return {
      className: "bg-field-soft text-field ring-field/15",
      valueClassName: "text-field-deep",
      unitClassName: "text-field",
      icon: <CheckCircle2 size={13} />,
    };
  }

  return {
    className: "bg-slate-100 text-slate-500 ring-slate-200",
    valueClassName: "text-slate-950",
    unitClassName: "text-slate-500",
    icon: <Hash size={13} />,
  };
}
