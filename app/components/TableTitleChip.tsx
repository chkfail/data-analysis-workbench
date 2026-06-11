import { Table2 } from "lucide-react";

export type TableTone = {
  label: string;
  upload: string;
  chipOn: string;
  chipOff: string;
  fieldSelect: string;
  action: string;
};

export function TableTitleChip({ title }: { title: string }) {
  const tone = getTableTone(title);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone.label}`}>
      <Table2 size={13} />
      {title}
    </span>
  );
}

export function getTableTone(title: string): TableTone {
  if (title.includes("检索表")) {
    return {
      label: "bg-field-soft text-field ring-1 ring-inset ring-field/15",
      upload: "border-emerald-200 bg-field-soft/45 text-field hover:border-field hover:bg-field-soft",
      chipOn: "bg-field text-white shadow-sm shadow-field/40",
      chipOff: "bg-field-soft/55 text-field-deep ring-1 ring-inset ring-field/15 hover:bg-field-soft hover:text-field hover:ring-field/30",
      fieldSelect: "hover:border-field/30 focus:border-field focus:ring-field-soft",
      action: "bg-field text-white shadow-field/40 hover:bg-field-deep",
    };
  }

  if (title.includes("参与") || title.includes("新表")) {
    return {
      label: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70",
      upload: "border-sky-200 bg-sky-50/45 text-sky-700 hover:border-sky-400 hover:bg-sky-50",
      chipOn: "bg-sky-700 text-white shadow-sm shadow-sky-700/25 hover:bg-sky-800",
      chipOff: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70 hover:bg-sky-100 hover:text-sky-800 hover:ring-sky-300/70",
      fieldSelect: "hover:border-sky-300 focus:border-sky-500 focus:ring-sky-100",
      action: "bg-sky-700 text-white shadow-sky-700/25 hover:bg-sky-800",
    };
  }

  if (title.includes("未命中")) {
    return {
      label: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70",
      upload: "border-amber-200 bg-amber-50/45 text-amber-700 hover:border-amber-400 hover:bg-amber-50",
      chipOn: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
      chipOff: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70 hover:bg-amber-100 hover:text-amber-800 hover:ring-amber-300/70",
      fieldSelect: "hover:border-amber-300 focus:border-amber-500 focus:ring-amber-100",
      action: "bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600",
    };
  }

  return {
    label: "bg-field-soft text-field ring-1 ring-inset ring-field/15",
    upload: "border-emerald-200 bg-field-soft/45 text-field hover:border-field hover:bg-field-soft",
    chipOn: "bg-field text-white shadow-sm shadow-field/40",
    chipOff: "bg-field-soft/55 text-field-deep ring-1 ring-inset ring-field/15 hover:bg-field-soft hover:text-field hover:ring-field/30",
    fieldSelect: "hover:border-field/30 focus:border-field focus:ring-field-soft",
    action: "bg-field text-white shadow-field/40 hover:bg-field-deep",
  };
}
