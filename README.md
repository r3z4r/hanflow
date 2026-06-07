# HanFlow

Korean Language Sandbox Canvas — interactive visual grammar breakdown of Korean sentences.

Built with SvelteKit 5 (Svelte 5 Runes), @xyflow/svelte, Drizzle ORM, Auth.js v5, Redis, and the Vercel AI SDK.

## Development

```bash
# Start local infra
docker compose up -d

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

## Stack

- **Framework:** SvelteKit + Svelte 5 (Runes)
- **Canvas:** @xyflow/svelte
- **Database:** PostgreSQL + Drizzle ORM
- **Cache:** Redis (ioredis)
- **Auth:** Auth.js v5
- **LLM:** Vercel AI SDK (Anthropic + Gemini)
- **Deployment:** Railway
