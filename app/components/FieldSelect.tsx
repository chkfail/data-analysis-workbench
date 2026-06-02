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
    <label className="grid gap-2 text-xs font-black text-slate-500">
      {label}
      <select
        className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-field focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400"
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
