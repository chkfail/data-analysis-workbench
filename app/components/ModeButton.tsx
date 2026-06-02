export function ModeButton({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      className={[
        "h-11 rounded-xl text-sm font-black transition",
        active ? "bg-field text-white shadow-md shadow-teal-900/15" : "text-slate-600 hover:bg-white/70"
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {title}
    </button>
  );
}
