export function FieldSelect({
  label,
  disabled,
  value,
  onChange,
  placeholder,
  options
}: {
  label: string;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-slate-500">
      {label}
      <select
        className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-field focus:ring-4 focus:ring-field-soft disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
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
