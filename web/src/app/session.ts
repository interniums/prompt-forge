import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SESSION_COOKIE = "pf_session_id";

export type SessionPreferences = {
  tone?: string;
  audience?: string;
  domain?: string;
};

export type SessionGeneration = {
  id: string;
  task: string;
  label: string;
  body: string;
  created_at: string;
};

export type SessionState = {
  sessionId: string;
  preferences: SessionPreferences;
  generations: SessionGeneration[];
};

/**
 * Read the session id from cookies in a Server Component context.
 * Does not create or modify cookies (writes are only allowed in Server Actions
 * and Route Handlers in Next 16).
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  return existing ?? null;
}

export async function loadSessionState(): Promise<SessionState> {
  const sessionIdFromCookie = await getSessionId();
  const sessionId = sessionIdFromCookie ?? "anonymous";
  const supabase = createServerSupabaseClient();

  if (!sessionIdFromCookie) {
    // No real session yet; return empty state without hitting the database.
    return {
      sessionId,
      preferences: {},
      generations: [],
    };
  }

  const { data: prefsRow } = await supabase
    .from("pf_preferences")
    .select("tone, audience, domain")
    .eq("session_id", sessionId)
    .maybeSingle();

  const preferences: SessionPreferences = {
    tone: prefsRow?.tone ?? undefined,
    audience: prefsRow?.audience ?? undefined,
    domain: prefsRow?.domain ?? undefined,
  };

  const { data: generationsRows } = await supabase
    .from("pf_generations")
    .select("id, task, label, body, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);

  const generations: SessionGeneration[] = (generationsRows ?? []).map((g) => ({
    id: g.id as string,
    task: g.task as string,
    label: g.label as string,
    body: g.body as string,
    created_at: g.created_at as string,
  }));

  return { sessionId, preferences, generations };
}
