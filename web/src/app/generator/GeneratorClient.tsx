"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assemblePrompt, type TemplateField } from "@/lib/prompt/assemble";
import { saveGeneration } from "./actions";
type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
};

type CurrentTemplate = {
  id: string;
  name: string;
  description: string | null;
  base_prompt: string;
};

export default function GeneratorClient({
  templates,
  currentTemplate,
  fields,
}: {
  templates: TemplateSummary[];
  currentTemplate: CurrentTemplate;
  fields: TemplateField[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.name] = "";
    }
    return initial;
  });

  const preview = useMemo(
    () => assemblePrompt(currentTemplate.base_prompt, values),
    [currentTemplate.base_prompt, values],
  );

  function handleTemplateChange(id: string) {
    const params = new URLSearchParams(searchParams ?? undefined);
    if (id) {
      params.set("templateId", id);
    } else {
      params.delete("templateId");
    }
    startTransition(() => {
      router.push(`/generator?${params.toString()}`);
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preview);
    } catch (err) {
      console.error("Failed to copy prompt", err);
    }
  }

  const filledFieldsJson = useMemo(
    () => JSON.stringify(values),
    [values],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Enchanted sandbox
        </p>
        <h1 className="text-lg font-semibold text-zinc-50">Generator</h1>
        <p className="text-sm text-zinc-400">
          Choose a template, fill a few structured fields, and refine the final prompt with live preview.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
        <section className="space-y-3">
          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Template
                </p>
                <p className="text-sm font-medium text-zinc-50">
                  {currentTemplate.name}
                </p>
                {currentTemplate.description ? (
                  <p className="text-[11px] text-zinc-500">
                    {currentTemplate.description}
                  </p>
                ) : null}
              </div>
              <div className="w-40 text-right">
                <label
                  htmlFor="template-select"
                  className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500"
                >
                  Switch
                </label>
                <select
                  id="template-select"
                  defaultValue={currentTemplate.id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-50 outline-none focus:border-zinc-400"
                  disabled={isPending}
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {fields.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  This template has no fields yet. You can still use it as-is, or add fields in the Template Builder.
                </p>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={field.name}
                        className="text-xs font-medium text-zinc-300"
                      >
                        {field.label}
                        {field.required ? (
                          <span className="ml-0.5 text-red-400">*</span>
                        ) : null}
                      </label>
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                        {field.field_type === "long_text" ? "Long" : "Short"}
                      </span>
                    </div>
                    {field.field_type === "long_text" ? (
                      <textarea
                        id={field.name}
                        rows={3}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                        placeholder={field.helper_text ?? ""}
                        value={values[field.name] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <input
                        id={field.name}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-zinc-400"
                        placeholder={field.helper_text ?? ""}
                        value={values[field.name] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Preview
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-100">
              {preview}
            </pre>
          </div>

          <form action={saveGeneration} className="space-y-2 text-[11px] text-zinc-400">
            <input type="hidden" name="template_id" value={currentTemplate.id} />
            <input type="hidden" name="final_prompt" value={preview} />
            <input type="hidden" name="filled_fields" value={filledFieldsJson} />
            <button
              type="submit"
              className="inline-flex h-7 items-center justify-center rounded-md bg-zinc-100 px-2.5 text-[11px] font-medium text-zinc-950 transition hover:bg-white"
            >
              Save to history
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
