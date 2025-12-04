import { createServerSupabaseClient } from "@/lib/supabase/server";
import GeneratorClient from "./GeneratorClient";

async function getTemplates() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, description")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load templates for generator", error);
    return [] as Array<{
      id: string;
      name: string;
      description: string | null;
    }>;
  }

  return (data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

async function getTemplateWithFields(id: string) {
  const supabase = createServerSupabaseClient();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("id, name, description, base_prompt")
    .eq("id", id)
    .single();

  if (templateError || !template) {
    console.error("Failed to load template for generator", templateError);
    return null;
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("template_fields")
    .select("id, name, label, field_type, required, helper_text, sort_order")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    console.error("Failed to load template fields for generator", fieldsError);
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

export default async function GeneratorPage({
  searchParams,
}: {
  searchParams?: { templateId?: string };
}) {
  const templates = await getTemplates();

  if (templates.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-zinc-50">Enchanted sandbox</h1>
        <p className="text-sm text-zinc-400">
          No templates yet. Create a template first, then come back here to fill it and generate prompts.
        </p>
      </div>
    );
  }

  const selectedId =
    searchParams?.templateId &&
    templates.some((t) => t.id === searchParams.templateId)
      ? searchParams.templateId
      : templates[0]?.id;

  const details = selectedId
    ? await getTemplateWithFields(selectedId)
    : null;

  if (!details) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-zinc-50">Enchanted sandbox</h1>
        <p className="text-sm text-zinc-400">
          Something went wrong loading this template. Try choosing a different one or refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <GeneratorClient
      templates={templates}
      currentTemplate={details.template}
      fields={details.fields}
    />
  );
}
