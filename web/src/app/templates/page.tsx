import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function createTemplate(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const basePrompt =
    String(formData.get("base_prompt") ?? "").trim() ||
    "You are an AI assistant. {{instructions}}";

  if (!name) {
    // Simple guard; in future we can surface a validation error in the UI.
    return;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .insert({ name, description, base_prompt: basePrompt })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create template", error);
    return;
  }

  redirect(`/templates/${data.id}`);
}

async function getTemplates() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load templates", error);
    return [] as Array<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
    }>;
  }

  return (data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  }>;
}

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-zinc-50">Templates</h1>
        <p className="text-sm text-zinc-400">
          Design prompt recipes once, then reuse them across Generator and Task Helper.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Your templates
          </h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
            {templates.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500">
                No templates yet. Create your first template on the right.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800 text-sm">
                {templates.map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <Link
                      href={`/templates/${t.id}`}
                      className="flex flex-col gap-1 hover:text-zinc-100"
                    >
                      <span className="font-medium text-zinc-50">{t.name}</span>
                      {t.description ? (
                        <span className="text-xs text-zinc-400 line-clamp-2">
                          {t.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            New template
          </h2>
          <form
            action={createTemplate}
            className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm"
          >
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-medium text-zinc-300">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                placeholder="Product spec, bug report, sales email..."
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="description"
                className="block text-xs font-medium text-zinc-300"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                placeholder="Short summary of what this template is for."
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="base_prompt"
                className="block text-xs font-medium text-zinc-300"
              >
                Base prompt (optional for now)
              </label>
              <textarea
                id="base_prompt"
                name="base_prompt"
                rows={3}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                placeholder="Core instructions with placeholders like {{audience}} or {{tone}}."
              />
              <p className="text-[11px] text-zinc-500">
                You can refine the structure and fields later in the Template Builder.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-100 px-3 text-xs font-medium text-zinc-950 transition hover:bg-white"
            >
              Create template
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
