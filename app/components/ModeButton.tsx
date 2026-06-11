export function ModeButton({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      className={[
        "h-11 rounded-[14px] text-sm font-bold transition",
        active ? "bg-field text-white shadow-md shadow-field/30" : "text-slate-500 hover:bg-white/80 hover:text-slate-800"
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {title}
    </button>
  );
}
