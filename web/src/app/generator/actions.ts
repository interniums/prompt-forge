"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveGeneration(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const finalPrompt = String(formData.get("final_prompt") ?? "").trim();
  const filledFieldsRaw = String(formData.get("filled_fields") ?? "{}");

  if (!templateId || !finalPrompt) {
    return;
  }

  let filledFields: Record<string, string> = {};
  try {
    filledFields = JSON.parse(filledFieldsRaw);
  } catch {
    // ignore parse errors and fall back to empty
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("generations").insert({
    template_id: templateId,
    filled_fields: filledFields,
    final_prompt: finalPrompt,
  });

  if (error) {
    console.error("Failed to save generation", error);
  }
}
