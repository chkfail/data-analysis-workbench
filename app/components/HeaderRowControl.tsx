import { useEffect, useState } from "react";

/** 表头行选择：默认自动识别，带标题行、制表信息行的报表可手动指定。 */
export function HeaderRowControl({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (headerRow: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const parsed = Math.min(Math.max(Math.floor(Number(draft)) || 1, 1), Math.max(max, 1));
    setDraft(String(parsed));
    if (parsed !== value) onChange(parsed);
  }

  return (
    <label
      className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 pl-3 pr-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200"
      title="表头所在的 Excel 行号"
    >
      表头第
      <input
        className="h-6 w-10 rounded-full bg-white text-center font-mono text-xs font-bold text-slate-800 outline-none ring-1 ring-inset ring-slate-200 focus:ring-field"
        type="number"
        min={1}
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
      />
      <span className="pr-2">行</span>
    </label>
  );
}
