import { FileSpreadsheet } from "lucide-react";
import type { ToolMode } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";

export function AppHeader({ activeTool, onToolChange }: { activeTool: ToolMode; onToolChange: (tool: ToolMode) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 text-sm font-black text-field">
          <img className="h-7 w-7 rounded-lg shadow-sm" src="/icon.svg" alt="" />
          数据研判工具集
        </div>
        <nav className="flex items-center gap-1 sm:justify-self-center" aria-label="工具导航">
          {(Object.keys(TOOL_DEFINITIONS) as ToolMode[]).map((tool) => (
            <HeaderNavButton key={tool} active={activeTool === tool} onClick={() => onToolChange(tool)} title={TOOL_DEFINITIONS[tool].title} />
          ))}
        </nav>
      </div>
    </header>
  );
}

function HeaderNavButton({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      className={[
        "h-10 px-4 text-sm font-black transition",
        active ? "border-b-2 border-field text-field" : "border-b-2 border-transparent text-slate-500 hover:text-slate-950"
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {title}
    </button>
  );
}
