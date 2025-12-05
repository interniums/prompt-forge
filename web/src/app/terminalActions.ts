"use server";

import OpenAI from "openai";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GENERIC_QUESTION_TEMPLATES } from "./terminalFallbacks";

export type PreferencesInput = {
  tone?: string;
  audience?: string;
  domain?: string;
};

export type GeneratedPrompt = {
  id: string;
  label: string;
  body: string;
};

export type HistoryItem = {
  id: string;
  task: string;
  label: string;
  body: string;
  created_at: string;
};

export type ClarifyingOption = {
  id: string;
  label: string;
};

export type ClarifyingQuestion = {
  id: string;
  question: string;
  options: ClarifyingOption[];
};

export type ClarifyingAnswer = {
  questionId: string;
  question: string;
  answer: string;
};

const SESSION_COOKIE = "pf_session_id";

async function getOrCreateActionSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();

  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  try {
    const supabase = createServerSupabaseClient();
    await supabase.from("pf_sessions").insert({ id }).select("id").single();
  } catch {
    // Non-fatal; cookie is still set.
  }

  return id;
}

function buildStyleLine(preferences: PreferencesInput): string {
  const parts: string[] = [];
  if (preferences.tone) parts.push(`tone: ${preferences.tone}`);
  if (preferences.audience) parts.push(`audience: ${preferences.audience}`);
  if (preferences.domain) parts.push(`domain: ${preferences.domain}`);

  if (parts.length === 0) {
    return "Keep the style clear, concrete, and concise.";
  }

  return `Keep the style aligned with: ${parts.join(", ")}.`;
}

/**
 * Step 1: Generate up to 3 clarifying questions (with optional choices)
 * tailored to the user's task. This is only called if the user agrees
 * to answer questions.
 */
export async function generateClarifyingQuestions(input: {
  task: string;
  preferences?: PreferencesInput;
}): Promise<ClarifyingQuestion[]> {
  const task = input.task.trim();
  if (!task) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback: use generic, deterministic clarifying questions so the full flow
    // can be tested without an OpenAI connection.
    return GENERIC_QUESTION_TEMPLATES.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }));
  }

  const client = new OpenAI({ apiKey });

  const styleLine = buildStyleLine(input.preferences ?? {});

  const system = [
    "You are PromptForge, an AI that designs short clarifying questions to improve prompts.",
    "Given a user's task, generate up to 3 short questions that will make the final prompt much more accurate.",
    "Each question should be tailored to the domain (coding, education, marketing, etc.).",
    "You may include 0-5 multiple-choice options per question.",
    "Return ONLY JSON with a `questions` array where each item has `id`, `question`, and `options`.",
  ].join(" ");

  const user = [
    `Task: ${task}`,
    `Preferences: ${styleLine}`,
  ].join("\n\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return [];

    type QuestionsJson = {
      questions?: Array<{
        id?: unknown;
        question?: unknown;
        options?: Array<{ id?: unknown; label?: unknown }>;
      }>;
    };

    let parsed: QuestionsJson;
    try {
      parsed = JSON.parse(raw) as QuestionsJson;
    } catch {
      return [];
    }

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

    return rawQuestions
      .slice(0, 3)
      .map((q, index) => {
        const id =
          typeof q.id === "string" && q.id.trim() ? q.id.trim() : `q${index + 1}`;
        const question =
          typeof q.question === "string" ? q.question.trim() : "";

        const rawOptions = Array.isArray(q.options) ? q.options : [];
        const options: ClarifyingOption[] = rawOptions.map((opt, optIndex) => {
          const defaultId = String.fromCharCode("a".charCodeAt(0) + optIndex);
          return {
            id:
              typeof opt.id === "string" && opt.id.trim()
                ? opt.id.trim()
                : defaultId,
            label:
              typeof opt.label === "string" ? opt.label.trim() : String(opt.label ?? "").trim(),
          };
        });

        return { id, question, options };
      })
      .filter((q) => q.question);
  } catch (err) {
    console.error("OpenAI clarifying question generation failed", err);
    return [];
  }
}

/**
 * Step 2: Generate the final, single prompt given the task and any clarifying answers.
 */
export async function generateFinalPrompt(input: {
  task: string;
  preferences?: PreferencesInput;
  answers?: ClarifyingAnswer[];
}): Promise<string> {
  const task = input.task.trim();
  if (!task) return "";

  const apiKey = process.env.OPENAI_API_KEY;
  const styleLine = buildStyleLine(input.preferences ?? {});

  // Fallback: no API key, synthesize a simple direct-instruction prompt.
  if (!apiKey) {
    return [
      "You are an AI assistant.",
      styleLine,
      "Task:",
      task,
    ].join("\n\n");
  }

  const client = new OpenAI({ apiKey });

  const system = [
    "You are PromptForge, an expert at writing single, high-quality prompts for another AI model.",
    "Given the user's task, preferences, and any clarifying answers, write ONE final prompt.",
    "The result should be ready to paste into another AI chat or API directly.",
    "Return ONLY JSON as { \"prompt\": \"...\" }.",
  ].join(" ");

  const parts: string[] = [
    `Task: ${task}`,
    `Preferences: ${styleLine}`,
  ];

  if (input.answers && input.answers.length > 0) {
    parts.push(
      "Clarifying answers:",
      ...input.answers.map(
        (a, index) => `Q${index + 1} (${a.questionId}): ${a.question}\nAnswer: ${a.answer}`,
      ),
    );
  }

  const user = parts.join("\n\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return task;

    type PromptJson = { prompt?: unknown };
    let parsed: PromptJson;
    try {
      parsed = JSON.parse(raw) as PromptJson;
    } catch {
      return task;
    }

    const prompt =
      typeof parsed.prompt === "string" && parsed.prompt.trim()
        ? parsed.prompt.trim()
        : task;

    return prompt;
  } catch (err) {
    console.error("OpenAI final prompt generation failed", err);
    return task;
  }
}

/**
 * Step 3: Edit an existing prompt according to a user edit request.
 */
export async function editPrompt(input: {
  currentPrompt: string;
  editRequest: string;
  preferences?: PreferencesInput;
}): Promise<string> {
  const current = input.currentPrompt.trim();
  const editRequest = input.editRequest.trim();
  if (!current || !editRequest) return current;

  const apiKey = process.env.OPENAI_API_KEY;
  const styleLine = buildStyleLine(input.preferences ?? {});

  if (!apiKey) {
    // Fallback: keep the existing prompt and surface the edit request as a comment
    // so the user can manually adjust it.
    return [
      current,
      '',
      '# OpenAI is not configured. Edit this prompt manually based on the request below:',
      `# Edit request: ${editRequest}`,
    ].join("\n");
  }

  const client = new OpenAI({ apiKey });

  const system = [
    "You are PromptForge, an expert prompt editor.",
    "You receive an existing prompt and an edit request.",
    "You must return the edited prompt only.",
    "Do not add explanations or comments.",
    "Return ONLY JSON as { \"prompt\": \"...\" }.",
  ].join(" ");

  const user = [
    `Existing prompt:\n${current}`,
    `Edit request: ${editRequest}`,
    `Preferences: ${styleLine}`,
  ].join("\n\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return current;

    type PromptJson = { prompt?: unknown };
    let parsed: PromptJson;
    try {
      parsed = JSON.parse(raw) as PromptJson;
    } catch {
      return current;
    }

    const prompt =
      typeof parsed.prompt === "string" && parsed.prompt.trim()
        ? parsed.prompt.trim()
        : current;

    return prompt;
  } catch (err) {
    console.error("OpenAI prompt edit failed", err);
    return current;
  }
}

/**
 * Persist the latest preferences for the current session.
 */
export async function savePreferences(preferences: PreferencesInput): Promise<void> {
  const sessionId = await getOrCreateActionSessionId();
  const supabase = createServerSupabaseClient();

  const payload = {
    session_id: sessionId,
    tone: preferences.tone ?? null,
    audience: preferences.audience ?? null,
    domain: preferences.domain ?? null,
  };

  const { error } = await supabase
    .from("pf_preferences")
    .upsert(payload, { onConflict: "session_id" });

  if (error) {
    console.error("Failed to save preferences", error);
  }
}

/**
 * Record a generation event for the current session.
 */
export async function recordGeneration(input: {
  task: string;
  prompt: GeneratedPrompt;
}): Promise<void> {
  const sessionId = await getOrCreateActionSessionId();
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("pf_generations").insert({
    session_id: sessionId,
    task: input.task,
    label: input.prompt.label,
    body: input.prompt.body,
  });

  if (error) {
    console.error("Failed to record generation", error);
  }
}

export async function listHistory(limit = 10): Promise<HistoryItem[]> {
  const sessionId = await getOrCreateActionSessionId();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("pf_generations")
    .select("id, task, label, body, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load history", error);
    return [];
  }

  return (data ?? []).map((g) => ({
    id: String(g.id),
    task: String(g.task),
    label: String(g.label),
    body: String(g.body),
    created_at: String(g.created_at),
  }));
}
