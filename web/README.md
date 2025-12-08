This `web` folder hosts the PromptForge terminal app (Next.js, App Router, TypeScript).

## Run

```bash
npm install
npm run dev
# open http://localhost:3000 (redirects to /generate)
```

Env (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Apply `../supabase-schema.sql` to your Supabase project before running locally.

## Commands

- Lint: `npm run lint`
- Build: `npm run build`

## Docs

- Project overview: `../README.md`
- Architecture: `../docs-architecture.md`
- Data flows: `../docs/DATA-FLOWS.md`
