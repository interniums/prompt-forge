import Link from "next/link";

export default function WorkspacePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-2xl space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          Workspace
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-zinc-50 sm:text-4xl">
          Choose how you want to work today.
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Use Fast &amp; Easy on the home screen when you just want to describe a task. Come here when you want a
          bit more structure and navigation between templates, history, and the Enchanted sandbox.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/generator"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-500"
        >
          <h2 className="mb-1 text-sm font-semibold text-zinc-50">Enchanted sandbox</h2>
          <p className="text-xs text-zinc-400">
            Work from templates and fields with a calm, controlled Generator flow.
          </p>
        </Link>
        <Link
          href="/templates"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-500"
        >
          <h2 className="mb-1 text-sm font-semibold text-zinc-50">Template Builder</h2>
          <p className="text-xs text-zinc-400">
            Design and refine reusable prompt recipes with split-view editing and preview.
          </p>
        </Link>
        <Link
          href="/history"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-500"
        >
          <h2 className="mb-1 text-sm font-semibold text-zinc-50">History</h2>
          <p className="text-xs text-zinc-400">
            Revisit and reuse prompts that have worked well in the past.
          </p>
        </Link>
        <Link
          href="/gallery"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-500"
        >
          <h2 className="mb-1 text-sm font-semibold text-zinc-50">Gallery</h2>
          <p className="text-xs text-zinc-400">
            Explore shared/public templates when you need inspiration.
          </p>
        </Link>
      </section>
    </div>
  );
}