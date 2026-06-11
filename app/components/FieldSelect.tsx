import type { TableTone } from "@/app/components/TableTitleChip";

export function FieldSelect({
  label,
  disabled,
  value,
  onChange,
  placeholder,
  options,
  tone
}: {
  label: string;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  tone?: TableTone;
}) {
  const focusTone = tone?.fieldSelect ?? "hover:border-field/30 focus:border-field focus:ring-field-soft";

  return (
    <label className="grid min-w-0 gap-2 text-xs font-bold text-slate-500">
      {label}
      <select
        className={`h-11 w-full min-w-0 truncate rounded-xl border border-line bg-paper px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:bg-white focus:ring-4 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none ${focusTone}`}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
