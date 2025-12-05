"use client";

import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-xs font-semibold text-zinc-100">
            PF
          </span>
          <span className="tracking-tight">PromptForge terminal</span>
        </div>
        <div className="text-[11px] text-zinc-500">
          Type <span className="font-mono text-zinc-300">/help</span> for available commands.
        </div>
      </div>
    </header>
  );
}
