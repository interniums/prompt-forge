import { FastEasyShell } from "@/components/FastEasyShell";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-stretch justify-center">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(37,99,235,0.18),_transparent_55%)] opacity-80" />
      <FastEasyShell />
    </div>
  );
}
