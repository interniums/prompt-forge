# PromptForge Data Flows Documentation

This document describes how data is stored, retrieved, and synchronized across the PromptForge application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Session Management](#session-management)
3. [Data Storage Layers](#data-storage-layers)
4. [State Persistence](#state-persistence)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [API Reference](#api-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │   React State    │    │   localStorage   │    │     Cookie       │       │
│  │  (FastEasyShell) │    │  (Draft State)   │    │  (Session ID)    │       │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘       │
│           │                       │                       │                  │
│           └───────────────────────┼───────────────────────┘                  │
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────┼──────────────────────────────────────────┐
│                          SERVER (Next.js)        │                           │
├───────────────────────────────────┼──────────────────────────────────────────┤
│                                   │                                          │
│  ┌──────────────────┐    ┌───────┴────────┐    ┌──────────────────┐         │
│  │  Server Actions  │◄───┤  session.ts    │    │   page.tsx       │         │
│  │ terminalActions  │    │  (Read-only)   │    │ (Server Comp)    │         │
│  └────────┬─────────┘    └────────────────┘    └──────────────────┘         │
│           │                                                                  │
└───────────┼──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE (PostgreSQL)                            │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ pf_sessions │  │ pf_preferences  │  │ pf_generations  │  │  pf_events  │  │
│  └─────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                                               │
│  ┌────────────────────┐                                                       │
│  │ pf_prompt_versions │                                                       │
│  └────────────────────┘                                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Session Management

### How Sessions Work

1. **First Visit (No Cookie)**

   - `loadSessionState()` returns `{ sessionId: 'pending', preferences: {}, generations: [] }`
   - Page renders with empty state
   - User can interact immediately

2. **First Server Action**

   - `getOrCreateActionSessionId()` creates a new UUID
   - Cookie `pf_session_id` is set (1-year expiry)
   - Session row created in `pf_sessions` table

3. **Subsequent Visits**
   - Cookie is read by `getSessionId()`
   - UUID is validated (security measure)
   - Data loaded from database

### Session ID Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  New User   │────►│  Page Load      │────►│  No Cookie      │
└─────────────┘     └─────────────────┘     └────────┬────────┘
                                                     │
                                                     ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │  First Action   │◄────│  Empty State    │
                    │  (e.g. submit)  │     │  Rendered       │
                    └────────┬────────┘     └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Create UUID    │
                    │  Set Cookie     │
                    │  Create DB Row  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Data Saved     │
                    │  With Session   │
                    └─────────────────┘
```

### Session Cookie Configuration

```typescript
{
  name: 'pf_session_id',
  httpOnly: true,        // Not accessible via JavaScript
  sameSite: 'lax',       // CSRF protection
  path: '/',             // Available site-wide
  maxAge: 31536000,      // 1 year in seconds
  secure: true,          // HTTPS only in production
}
```

---

## Data Storage Layers

### Layer 1: React State (Memory)

**Location:** `FastEasyShell.tsx` component state

**What's Stored:**
| State | Description | Survives Reload? |
|-------|-------------|------------------|
| `value` | Current input text | ❌ |
| `lines` | Terminal history | ❌ |
| `pendingTask` | Current task being worked on | ❌ (see Layer 2) |
| `editablePrompt` | Draft prompt | ❌ (see Layer 2) |
| `clarifyingQuestions` | Current questions | ❌ |
| `answeringQuestions` | Flow state | ❌ |
| `preferences` | User preferences | ✅ (from DB) |

**Lifecycle:** Cleared on page refresh or navigation.

---

### Layer 2: localStorage (Draft Persistence)

**Location:** Browser localStorage via `useDraftPersistence` hook

**What's Stored:**

```typescript
interface DraftState {
  task: string | null // User's task description
  editablePrompt: string | null // Draft prompt being edited
  clarifyingAnswers: Array<{
    // Answers given so far
    questionId: string
    question: string
    answer: string
  }> | null
  currentQuestionIndex: number // Progress in Q&A flow
  wasAnsweringQuestions: boolean
}
```

**Features:**

- ✅ Debounced saves (1 second)
- ✅ Auto-expiry (24 hours)
- ✅ Version migration support
- ✅ Graceful degradation if storage unavailable
- ✅ Cleared on `/discard` or prompt approval

**Storage Key:** `pf_draft`

---

### Layer 3: Cookie (Session Identity)

**Location:** HTTP-only cookie

**What's Stored:**
| Cookie | Value | Purpose |
|--------|-------|---------|
| `pf_session_id` | UUID v4 | Links user to their data |

**Security:**

- HTTP-only (no JavaScript access)
- Validated as UUID format before use
- Invalid cookies are ignored

---

### Layer 4: Supabase Database (Persistent)

**Location:** PostgreSQL via Supabase

**Tables:**

#### `pf_sessions`

```sql
CREATE TABLE pf_sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `pf_preferences`

```sql
CREATE TABLE pf_preferences (
  session_id UUID PRIMARY KEY REFERENCES pf_sessions(id),
  tone TEXT,        -- e.g., "casual", "formal"
  audience TEXT,    -- e.g., "developers", "executives"
  domain TEXT,      -- e.g., "engineering", "marketing"
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `pf_generations`

```sql
CREATE TABLE pf_generations (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES pf_sessions(id),
  task TEXT NOT NULL,      -- Original task description
  label TEXT NOT NULL,     -- e.g., "Final prompt"
  body TEXT NOT NULL,      -- The generated prompt
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `pf_events`

```sql
CREATE TABLE pf_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES pf_sessions(id),
  event_type TEXT NOT NULL,  -- e.g., "task_submitted", "prompt_copied"
  payload JSONB NOT NULL,    -- Event-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `pf_prompt_versions`

```sql
CREATE TABLE pf_prompt_versions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES pf_sessions(id),
  source_event_id UUID REFERENCES pf_events(id),
  task TEXT NOT NULL,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  revision INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## State Persistence

### What Gets Saved Where

| Data               | localStorage | Cookie | Database | Restored on Reload?     |
| ------------------ | ------------ | ------ | -------- | ----------------------- |
| Session ID         | ❌           | ✅     | ✅       | ✅ Yes                  |
| Preferences        | ❌           | ❌     | ✅       | ✅ Yes                  |
| Saved Prompts      | ❌           | ❌     | ✅       | ✅ Yes (via `/history`) |
| Draft Task         | ✅           | ❌     | ❌       | ✅ Yes                  |
| Draft Prompt       | ✅           | ❌     | ❌       | ✅ Yes                  |
| Clarifying Answers | ✅           | ❌     | ❌       | ✅ Yes (partial)        |
| Terminal Lines     | ❌           | ❌     | ❌       | ❌ No                   |
| UI Selection State | ❌           | ❌     | ❌       | ❌ No                   |

### Draft Persistence Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    DRAFT PERSISTENCE FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User types task ──► Debounce (1s) ──► Save to localStorage     │
│                                                                  │
│  User edits prompt ──► Debounce (1s) ──► Save to localStorage   │
│                                                                  │
│  User answers question ──► Immediate save to localStorage       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User approves prompt ──► Clear localStorage ──► Save to DB     │
│                                                                  │
│  User types /discard ──► Clear localStorage ──► Reset state     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Page reload ──► Load from localStorage ──► Restore state       │
│                 ──► Show "Draft restored" toast                 │
│                                                                  │
│  Draft > 24h old ──► Ignore and clear localStorage              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: First-Time User Task Submission

```
User                    Client                    Server                    Database
  │                        │                         │                          │
  │  Types task            │                         │                          │
  │───────────────────────►│                         │                          │
  │                        │                         │                          │
  │                        │  Save draft             │                          │
  │                        │  (localStorage)         │                          │
  │                        │                         │                          │
  │  Presses Enter         │                         │                          │
  │───────────────────────►│                         │                          │
  │                        │                         │                          │
  │                        │  recordEvent()          │                          │
  │                        │────────────────────────►│                          │
  │                        │                         │                          │
  │                        │                         │  Create session          │
  │                        │                         │─────────────────────────►│
  │                        │                         │                          │
  │                        │                         │  Set cookie              │
  │                        │◄────────────────────────│                          │
  │                        │                         │                          │
  │                        │  generateQuestions()    │                          │
  │                        │────────────────────────►│                          │
  │                        │                         │  Call OpenAI             │
  │                        │                         │─────────────────────────►│
  │                        │                         │                          │
  │  Shows questions       │◄────────────────────────│                          │
  │◄───────────────────────│                         │                          │
  │                        │                         │                          │
```

### Flow 2: Page Reload with Draft

```
User                    Client                    Server                    Database
  │                        │                         │                          │
  │  Reloads page          │                         │                          │
  │───────────────────────►│                         │                          │
  │                        │                         │                          │
  │                        │  loadSessionState()     │                          │
  │                        │◄────────────────────────│                          │
  │                        │                         │  Read preferences        │
  │                        │                         │─────────────────────────►│
  │                        │                         │                          │
  │                        │                         │  Read generations        │
  │                        │                         │─────────────────────────►│
  │                        │                         │                          │
  │                        │  loadDraft()            │                          │
  │                        │  (localStorage)         │                          │
  │                        │                         │                          │
  │  Shows restored        │                         │                          │
  │  draft + toast         │                         │                          │
  │◄───────────────────────│                         │                          │
  │                        │                         │                          │
```

### Flow 3: Prompt Approval

```
User                    Client                    Server                    Database
  │                        │                         │                          │
  │  Clicks Approve        │                         │                          │
  │───────────────────────►│                         │                          │
  │                        │                         │                          │
  │                        │  Copy to clipboard      │                          │
  │                        │                         │                          │
  │                        │  clearDraft()           │                          │
  │                        │  (localStorage)         │                          │
  │                        │                         │                          │
  │                        │  recordGeneration()     │                          │
  │                        │────────────────────────►│                          │
  │                        │                         │                          │
  │                        │                         │  Insert pf_generations   │
  │                        │                         │─────────────────────────►│
  │                        │                         │                          │
  │                        │                         │  Insert pf_prompt_vers   │
  │                        │                         │─────────────────────────►│
  │                        │                         │                          │
  │  Shows confirmation    │                         │                          │
  │◄───────────────────────│                         │                          │
  │                        │                         │                          │
```

---

## API Reference

### Server Actions (`terminalActions.ts`)

#### `generateClarifyingQuestions(input)`

Generates up to 3 clarifying questions using OpenAI.

```typescript
input: {
  task: string
  preferences?: Preferences
}
returns: Promise<ClarifyingQuestion[]>
```

#### `generateFinalPrompt(input)`

Generates the final prompt based on task and answers.

```typescript
input: {
  task: string
  preferences?: Preferences
  answers?: ClarifyingAnswer[]
}
returns: Promise<string>
```

#### `editPrompt(input)`

Edits an existing prompt based on user instructions.

```typescript
input: {
  currentPrompt: string
  editRequest: string
  preferences?: Preferences
}
returns: Promise<string>
```

#### `savePreferences(preferences)`

Saves user preferences to database.

```typescript
preferences: {
  tone?: string
  audience?: string
  domain?: string
}
returns: Promise<boolean>
```

#### `recordGeneration(input)`

Records a generated prompt to history.

```typescript
input: {
  task: string
  prompt: {
    id: string
    label: string
    body: string
  }
}
returns: Promise<string | null> // generation ID
```

#### `listHistory(limit)`

Lists recent prompt generations.

```typescript
limit: number = 10
returns: Promise<HistoryItem[]>
```

#### `recordEvent(eventType, payload)`

Records an analytics event.

```typescript
eventType: string // e.g., "task_submitted", "prompt_copied"
payload: Record<string, unknown>
returns: Promise<string | null> // event ID
```

### Session Functions (`session.ts`)

#### `getSessionId()`

Reads session ID from cookie (read-only).

```typescript
returns: Promise<string | null>
```

#### `loadSessionState()`

Loads full session state for server rendering.

```typescript
returns: Promise<{
  sessionId: string
  preferences: Preferences
  generations: HistoryItem[]
}>
```

### Draft Persistence (`useDraftPersistence.ts`)

#### `loadDraft()`

Loads draft from localStorage.

```typescript
returns: DraftState | null
```

#### `clearDraft()`

Clears saved draft.

```typescript
returns: void
```

#### `useDraftPersistence(draft, enabled)`

Hook for auto-saving draft state.

```typescript
draft: DraftState
enabled: boolean  // Disable during generation
returns: void
```

---

## Error Handling

### Database Errors

| Error Code | Meaning               | Handling                                |
| ---------- | --------------------- | --------------------------------------- |
| `23503`    | Foreign key violation | Retry after ensuring session exists     |
| `23505`    | Unique violation      | Ignore (race condition, already exists) |
| `PGRST116` | No rows returned      | Return empty array/null                 |

### localStorage Errors

| Scenario         | Handling                             |
| ---------------- | ------------------------------------ |
| Storage disabled | Gracefully skip persistence          |
| Storage full     | Log warning, continue without saving |
| Parse error      | Clear corrupted data, return null    |

### Cookie Errors

| Scenario            | Handling                                     |
| ------------------- | -------------------------------------------- |
| Invalid UUID format | Log warning, return null, create new session |
| Missing cookie      | Create new session on first action           |

---

## Security Considerations

1. **Session ID Validation**: UUIDs are validated before use to prevent injection
2. **HTTP-Only Cookies**: Session cookie not accessible via JavaScript
3. **Service Role Key**: Only used server-side, never exposed to client
4. **No Sensitive Data in localStorage**: Only draft content, no auth tokens

---

## Performance Considerations

1. **Debounced Saves**: Draft persistence debounced to 1 second
2. **Lazy Session Creation**: Session only created on first action, not page load
3. **Limited History**: Only last 10 generations loaded
4. **Race Condition Handling**: Upserts used to handle concurrent requests

---

## Troubleshooting

### Draft Not Restoring

1. Check if localStorage is enabled in browser
2. Check if draft is older than 24 hours
3. Check browser console for errors

### Session Not Persisting

1. Check if cookies are enabled
2. Check if cookie was set (DevTools > Application > Cookies)
3. Check server logs for session creation errors

### Data Not Saving to Database

1. Check Supabase connection (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
2. Check server action logs for errors
3. Verify session exists in pf_sessions table
