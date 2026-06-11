import type { ToolMode } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";

export function AppHeader({ activeTool, onToolChange }: { activeTool: ToolMode; onToolChange: (tool: ToolMode) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/95 text-white shadow-lg shadow-ink/20 backdrop-blur supports-[backdrop-filter]:bg-ink/90">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2.5 text-sm font-bold tracking-wide">
          <img className="h-7 w-7 rounded-lg ring-1 ring-white/20" src="/icon.svg" alt="" />
          数据研判工具箱
        </div>
        <nav
          className="flex items-center gap-1 overflow-x-auto rounded-full bg-white/[0.07] p-1 ring-1 ring-white/10 sm:justify-self-center"
          aria-label="工具导航"
        >
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
        "h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold transition",
        active ? "bg-field text-white shadow-md shadow-field/30" : "text-slate-300 hover:bg-white/10 hover:text-white"
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {title}
    </button>
  );
}
