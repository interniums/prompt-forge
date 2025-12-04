import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getTemplate(id: string) {
  const supabase = createServerSupabaseClient();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("id, name, description, base_prompt, created_at, updated_at")
    .eq("id", id)
    .single();

  if (templateError || !template) {
    console.error("Failed to load template", templateError);
    return null;
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("template_fields")
    .select("id, name, label, field_type, required, helper_text, sort_order")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    console.error("Failed to load template fields", fieldsError);
  }

  return {
    template,
    fields: fields ?? [],
  } as {
    template: {
      id: string;
      name: string;
      description: string | null;
      base_prompt: string;
      created_at: string;
      updated_at: string;
    };
    fields: Array<{
      id: string;
      name: string;
      label: string;
      field_type: string;
      required: boolean;
      helper_text: string | null;
      sort_order: number;
    }>;
  };
}

async function updateTemplate(formData: FormData) {
  "use server";

  const id = String(formData.get("template_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const basePrompt = String(formData.get("base_prompt") ?? "").trim();

  if (!id || !name) {
    return;
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("templates")
    .update({ name, description, base_prompt: basePrompt })
    .eq("id", id);

  if (error) {
    console.error("Failed to update template", error);
  }

  redirect(`/templates/${id}`);
}

async function addField(formData: FormData) {
  "use server";

  const templateId = String(formData.get("template_id") ?? "");
  const name = String(formData.get("field_name") ?? "").trim();
  const label = String(formData.get("field_label") ?? "").trim();
  const helperText = String(formData.get("field_helper_text") ?? "").trim() || null;
  const fieldType =
    String(formData.get("field_type") ?? "").trim() || "short_text";
  const required = formData.get("field_required") != null;

  if (!templateId || !name || !label) {
    return;
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("template_fields").insert({
    template_id: templateId,
    name,
    label,
    helper_text: helperText,
    field_type: fieldType,
    required,
  });

  if (error) {
    console.error("Failed to add field", error);
  }

  redirect(`/templates/${templateId}`);
}

export default async function TemplateBuilderPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getTemplate(params.id);

  if (!result) {
    notFound();
  }

  const { template, fields } = result;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Template Builder
        </p>
        <h1 className="text-lg font-semibold text-zinc-50">{template.name}</h1>
        {template.description ? (
          <p className="text-sm text-zinc-400">{template.description}</p>
        ) : null}
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Template
        </h2>
        <form className="space-y-3" action={updateTemplate}>
          <input type="hidden" name="template_id" value={template.id} />
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-medium text-zinc-300"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={template.name}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-xs font-medium text-zinc-300"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={template.description ?? ""}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
              placeholder="What this template is for."
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="base_prompt"
              className="block text-xs font-medium text-zinc-300"
            >
              Base prompt
            </label>
            <textarea
              id="base_prompt"
              name="base_prompt"
              rows={5}
              defaultValue={template.base_prompt}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
              placeholder="Core instructions with placeholders like {{audience}} or {{tone}}."
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-100 px-3 text-xs font-medium text-zinc-950 transition hover:bg-white"
          >
            Save template
          </button>
        </form>
      </section>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Fields
          </h2>
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
            <form className="space-y-2" action={addField}>
              <input type="hidden" name="template_id" value={template.id} />
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label
                    htmlFor="field_label"
                    className="block text-[11px] font-medium text-zinc-300"
                  >
                    Label
                  </label>
                  <input
                    id="field_label"
                    name="field_label"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                    placeholder="Audience, Tone, Format..."
                  />
                </div>
                <div className="w-40 space-y-1.5">
                  <label
                    htmlFor="field_name"
                    className="block text-[11px] font-medium text-zinc-300"
                  >
                    Key
                  </label>
                  <input
                    id="field_name"
                    name="field_name"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                    placeholder="audience, tone..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <input
                    id="field_required"
                    name="field_required"
                    type="checkbox"
                    className="h-3 w-3 rounded border border-zinc-600 bg-zinc-950 text-zinc-100"
                  />
                  <label htmlFor="field_required">Required</label>
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="field_type">Type</label>
                  <select
                    id="field_type"
                    name="field_type"
                    className="h-6 rounded-md border border-zinc-700 bg-zinc-950 px-1.5 text-[11px] text-zinc-50"
                    defaultValue="short_text"
                  >
                    <option value="short_text">Short text</option>
                    <option value="long_text">Long text</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="field_helper_text"
                  className="block text-[11px] font-medium text-zinc-300"
                >
                  Helper text (optional)
                </label>
                <input
                  id="field_helper_text"
                  name="field_helper_text"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                  placeholder="Explain what a good answer looks like."
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-7 items-center justify-center rounded-md bg-zinc-100 px-2.5 text-[11px] font-medium text-zinc-950 transition hover:bg-white"
              >
                Add field
              </button>
            </form>

            {fields.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No fields yet. Add variables like audience, tone, format, and examples to structure this template.
              </p>
            ) : (
              <ul className="space-y-2">
                {fields.map((field) => (
                  <li
                    key={field.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-50">
                        {field.label}
                        {field.required ? <span className="text-red-400">*</span> : null}
                      </div>
                      <div className="text-[11px] text-zinc-500">{field.name}</div>
                      {field.helper_text ? (
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {field.helper_text}
                        </div>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      {field.field_type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Preview
          </h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-100">
              {template.base_prompt}
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            As the builder evolves, this preview will use placeholder values for your fields and show exactly what
            Generator will send to the model.
          </p>
        </section>
      </div>
    </div>
  );
}
