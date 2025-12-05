import { FastEasyShell, type TerminalLine, type Preferences } from "@/components/FastEasyShell";
import { loadSessionState } from "./session";

function buildInitialLines(generations: Awaited<ReturnType<typeof loadSessionState>>["generations"]): TerminalLine[] {
  const lines: TerminalLine[] = [
    {
      id: 0,
      role: "system",
      text: "Describe your task and what kind of AI answer you expect.",
    },
  ];

  let nextId = 1;

  for (const g of generations.slice().reverse()) {
    lines.push(
      {
        id: nextId++,
        role: "user",
        text: g.task,
      },
      {
        id: nextId++,
        role: "app",
        text: `Previous prompt (${g.label}):\n\n${g.body}`,
      },
    );
  }

  return lines;
}

export default async function Home() {
  const state = await loadSessionState();
  const initialLines = buildInitialLines(state.generations);
  const initialPreferences: Preferences = {
    tone: state.preferences.tone,
    audience: state.preferences.audience,
    domain: state.preferences.domain,
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-stretch justify-center">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(37,99,235,0.18),_transparent_55%)] opacity-80" />
      <FastEasyShell initialLines={initialLines} initialPreferences={initialPreferences} />
    </div>
  );
}
