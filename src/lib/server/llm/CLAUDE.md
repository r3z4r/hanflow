# LLM Parsing Pipeline

Turns a raw Korean sentence into a `ParsedSentence`
(`src/lib/schemas/sentence.ts`) via Vercel AI SDK's `generateObject()`.

## Files

- `index.ts` — model registry. `primaryModel` = Anthropic `claude-haiku-4-5-20251001`,
  `fallbackModel` = Google `gemini-2.0-flash`. Swapping providers/models is a
  one-file change.
- `parse.ts` — `parseSentence(sentence)`: tries `primaryModel`; on **any** thrown
  error (no inspection of error type) falls back once to `fallbackModel`. Both calls
  use `temperature: 0.1` — **don't raise this**. Results are cached by content hash
  (`hanflow:parsed:<sha256>`) for 7 days, so identical input must keep producing
  near-identical output across calls.
- `prompt.ts` — `buildSystemPrompt()`: one large system-prompt string containing
  explicit field rules plus a single complete few-shot example
  (`저는 학교에 갑니다`, fully parsed).

## Schema is the contract (`src/lib/schemas/sentence.ts`)

`ParsedSentenceSchema` is:
1. passed directly as the `schema` to `generateObject` (constrains the LLM's output),
2. used to `safeParse` cached Redis JSON and `sentence_history.parsed_result` JSONB on
   read (see `src/lib/server/db/CLAUDE.md`), and
3. the type consumed by the canvas (`canvas.state.svelte.ts` and all node components).

**Any field added/renamed/retyped here must be reflected in `prompt.ts`'s rules and/or
few-shot example**, or the model won't populate it correctly — there's no automated
check that the prompt matches the schema.

## Prompt rules worth knowing

- **Token IDs** must be `"tok_0"`, `"tok_1"`, ... matching `position`. Canvas edges
  (`particleBridges[].particleTokenId`/`nounTokenId`) and glossary
  (`glossary[].tokenId`) reference these IDs, not array indices — if the model ever
  produces non-sequential or duplicate IDs, bridges/glossary lookups silently no-op
  (return `null`/`undefined`, not an error).
- **Particle type mapping** is spelled out explicitly: 은/는 → topic, 이/가 →
  subject, 을/를 → object, 에 → location/direction. If parsing quality drifts for a
  particular particle, this is the first place to add a rule.
- **Romanization must be Revised Romanization**, not McCune-Reischauer — stated
  explicitly because LLMs default to the latter.
- `glossary[].exampleSentences` is capped at 3 by the schema (`.max(3)`), but the
  few-shot example only shows 1 — don't expect the model to consistently fill all 3
  without adding more examples to the prompt.

## Adding a new `TokenType` / phonetic phenomenon / field

1. Update the relevant enum/shape in `src/lib/schemas/sentence.ts`. **Prefer
   `.optional()` for new top-level fields** — the same schema `safeParse`s pre-existing
   Redis cache entries and `sentence_history` rows that predate the field, so a required
   field would invalidate all of them (forced re-parse / unrenderable history). Example:
   `translation` (full-sentence English translation) is optional and rendered
   conditionally in `routes/canvas/+page.svelte`.
2. Add a rule and/or extend the few-shot example in `prompt.ts` so the model knows
   when/how to use it.
3. If it affects rendering, update
   `src/lib/components/canvas/CLAUDE.md`'s "Adding a new node type" section too.
4. Run `pnpm check`, then manually test with a sentence that should trigger the new
   field — there's no automated test for prompt output quality, only schema
   validation.
