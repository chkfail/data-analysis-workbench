import type { ToolMode } from "@/app/types";
import { TOOL_DEFINITIONS } from "@/app/config/tools";

export function AppHeader({ activeTool, onToolChange }: { activeTool: ToolMode; onToolChange: (tool: ToolMode) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-field/10 bg-field-soft/80 text-ink shadow-sm shadow-field/10 backdrop-blur supports-[backdrop-filter]:bg-field-soft/80">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2.5 text-base font-black tracking-wide text-field-deep">
          <img className="h-7 w-7 rounded-lg ring-1 ring-field/15" src="/icon.svg" alt="" />
          数据研判工具箱
        </div>
        <nav
          className="flex items-center gap-1 overflow-x-auto rounded-full bg-white/55 p-1 ring-1 ring-field/10 sm:justify-self-center"
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
        active
          ? "bg-field text-white shadow-md shadow-field/25"
          : "text-slate-500 hover:bg-field-soft hover:text-field-deep"
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {title}
    </button>
  );
}
