export type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
};

export type Template = TemplateSummary & {
  base_prompt: string;
  created_at?: string;
  updated_at?: string;
};

export type TemplateField = {
  id: string;
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  helper_text: string | null;
  sort_order?: number;
};
