# Database & Cache

## Schema (`schema.ts`)

- **Auth.js v5 required tables** (DrizzleAdapter contract — don't rename columns
  without updating the adapter config in `src/auth.ts`): `users`, `accounts`,
  `sessions`, `verificationTokens`.
- **`sentenceHistory`** — the main app-specific table:
  - `userId` is **nullable** with `onDelete: 'set null'` — history rows survive user
    deletion (anonymized), unlike `accounts`/`sessions` which cascade-delete with the
    user.
  - `parsedResult: jsonb` stores the full `ParsedSentence`. Always re-validate with
    `ParsedSentenceSchema.safeParse()` on read (see `routes/canvas/+page.server.ts`)
    — old rows can hold JSON that no longer matches the current schema after a schema
    change.
  - Indexed on `userId` (history page query) and `sentenceHash` (canvas fallback
    lookup by hash).
- **`parseFeedback`** — "report incorrect parse" submissions (`sentenceHash`,
  `sentenceText`, optional `reason`, nullable `userId` → `set null`). Written only by
  `POST /api/feedback` (hashes the text server-side via `hashSentence`; no auth
  required). Indexed on `sentenceHash`. Read it via `pnpm db:studio`.

After changing `schema.ts`: `pnpm db:generate` (writes a migration under
`drizzle/migrations`, per `drizzle.config.ts`) then `pnpm db:migrate`. `pnpm db:studio`
opens Drizzle Studio against `DATABASE_URL`.

## Redis cache (`../redis.ts`)

Singleton on `globalThis.__redis` — required to survive Vite HMR; without it every
hot-reload would open a new Redis connection. `lazyConnect: true` (no connection until
first command), `maxRetriesPerRequest: 3`.

**Fail-soft access:** the client has an `'error'` listener (without it ioredis emits
"Unhandled error event" and can crash the process when Redis is down). Routes read/write
through the `cacheGet` / `cacheSet` helpers, which swallow Redis failures — a cache
outage degrades to a cache miss (re-parse / DB fallback), never a 500. Use these helpers,
not `redis.get`/`redis.setex` directly, in request paths.

### Cache key & TTL

```
key = `hanflow:parsed:${hash}`
hash = sha256(sentence.trim().normalize('NFC'))   // src/lib/utils/hash.ts
ttl  = 60 * 60 * 24 * 7   // 7 days — hardcoded separately in both +page.server.ts files
```

NFC normalization matters: Hangul can be represented as precomposed syllables or
decomposed jamo sequences that render identically but hash differently without it.

## Read-through flow (`GET /canvas`, `routes/canvas/+page.server.ts`)

1. Resolve `hash` from `?hash=` query param, falling back to the `hf_key` cookie.
2. Redis hit → `ParsedSentenceSchema.safeParse`, return if valid.
3. Redis miss/invalid → query `sentenceHistory` by `sentenceHash` (most recent row),
   validate, **re-seed Redis** with the same 7-day TTL.
4. Nothing found / invalid in either → `redirect(303, '/')`.

## Write path (`POST /`, `routes/+page.server.ts`)

`isHangulOnly()` (`../korean.ts` — regex allowing Hangul syllables, compatibility
jamo, punctuation, whitespace) gates everything before hashing. On a cache miss, the
fresh `parseSentence()` result is written to Redis **before** the history insert. The
history insert is fire-and-forget (errors are logged, don't fail the request) and only
runs if `locals.auth()` returns a session.

The `hf_key` cookie stores **only the hash** (httpOnly, `secure` in production) — the
full parsed JSON can exceed the ~4KB cookie size limit for longer sentences, which is
why `/canvas` re-fetches from Redis/DB instead of reading the result from the cookie.
