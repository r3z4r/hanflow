# HanFlow — Design Specification
**Date:** 2026-06-06  
**Status:** Approved  
**Project:** Korean Language Sandbox Canvas

---

## 1. Product Overview

HanFlow ingests any beginner-to-intermediate Korean sentence and maps it onto an interactive visual topology canvas. Users actively dissect grammar mechanics down to the syllable level instead of passively reading flat translations.

**Target users:** Korean language learners who have finished Hangul and want to understand sentence structure.  
**Business model:** B2C SaaS — free tier + future in-app purchase / Pro plan.

---

## 2. Confirmed Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | SvelteKit + Svelte 5 (Runes only) | Full-stack, server actions, modern reactive primitives |
| Canvas | @xyflow/svelte | Purpose-built node graph, handles edges/zoom/pan |
| Themes | Dark Immersive + Light Academic | CSS custom properties, toggle persisted in localStorage |
| Mobile | Mobile-first throughout | Primary target device |
| LLM | Vercel AI SDK (Anthropic primary, Gemini fallback) | Unified `generateObject()` with Zod schema, provider swap = env var |
| Cache | Redis via ioredis | SHA-256 sentence hash → parsed JSON, 7-day TTL |
| Auth | Auth.js v5 (@auth/sveltekit) | GitHub + Google OAuth + email/password, DrizzleAdapter |
| Database | PostgreSQL + Drizzle ORM | Type-safe schema, node-postgres driver |
| Deployment | Railway (adapter-node) | Native Postgres + Redis add-ons, zero devops |
| Validation | Zod | LLM output shape enforcement + form validation |

---

## 3. Feature Definitions

### Feature 1: Input Sandbox
- Centered textarea on home page (`/`)
- Client-side Hangul-only validation: reject non-Korean text with inline micro-notification before submission
- Server-side Hangul validation as authoritative guard
- SvelteKit form action processes submission → Redis check → LLM call → Redis store → redirect to `/canvas`

### Feature 2: Topology Canvas
Interactive node graph at `/canvas`:

| Node Color | Token Type |
|---|---|
| Blue | Noun, Pronoun |
| Purple | Particle (은/는, 이/가, 을/를, etc.) |
| Green | Verb, Adjective |
| Grey | Adverb, Modifier, Conjunction |

**Interactions:**
- **Particle Bridge:** hover Purple node → animated SVG cubic Bezier path drawn to governing Noun node
- **Conjugation Ancestry:** click Green node → inline expansion showing `Dictionary Form → Stem → Infix → Polite Form` derivation steps
- **Mobile:** tap = hover + select (mouseenter doesn't fire on touch); `nodesDraggable={false}` on mobile

### Feature 3: Deep Context Sidebar
- **Desktop:** sliding right drawer (380px wide), `translateX` CSS transition
- **Mobile:** bottom sheet, `translateY` CSS transition, `border-radius: 16px 16px 0 0`
- **Tabs:** Phonetic | Grammar | Glossary
  - *Phonetic:* batchim assimilation, liaison, nasalization explanations
  - *Grammar:* SOV structure, formality level, comparison to SVO
  - *Glossary:* headword, POS, definition, up to 2 example sentences

---

## 4. Architecture

### 4.1 Project Structure

```
src/
├── app.html                        # FOUC-prevention inline theme script
├── app.css                         # CSS custom property tokens (dark/light)
├── app.d.ts                        # App.Locals, Session type augmentations
├── auth.ts                         # Auth.js v5 config (single source of truth)
├── hooks.server.ts                 # sequence(authHandle, ...)
│
├── lib/
│   ├── server/                     # Never imported in client code
│   │   ├── db/
│   │   │   ├── index.ts            # drizzle() singleton
│   │   │   └── schema.ts           # all table definitions
│   │   ├── redis.ts                # ioredis singleton
│   │   ├── korean.ts               # isHangulOnly() regex
│   │   └── llm/
│   │       ├── index.ts            # model registry
│   │       ├── prompt.ts           # system prompt + few-shot example
│   │       └── parse.ts            # parseSentence() with primary/fallback
│   │
│   ├── schemas/
│   │   └── sentence.ts             # ParsedSentenceSchema (Zod) — shared client+server
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── TopologyCanvas.svelte
│   │   │   ├── canvas.state.svelte.ts
│   │   │   ├── nodes/
│   │   │   │   ├── TokenNode.svelte
│   │   │   │   ├── NounNode.svelte
│   │   │   │   ├── ParticleNode.svelte
│   │   │   │   ├── VerbNode.svelte
│   │   │   │   └── ConjugationExpansion.svelte
│   │   │   └── edges/
│   │   │       └── ParticleBridgeEdge.svelte
│   │   ├── sidebar/
│   │   │   ├── DeepContextSidebar.svelte
│   │   │   ├── BottomSheet.svelte
│   │   │   ├── PhoneticSection.svelte
│   │   │   ├── GrammarSection.svelte
│   │   │   └── GlossarySection.svelte
│   │   ├── sandbox/
│   │   │   ├── InputSandbox.svelte
│   │   │   └── HangulValidator.svelte
│   │   └── ui/
│   │       ├── ThemeToggle.svelte
│   │       ├── NavBar.svelte
│   │       ├── Notification.svelte
│   │       └── LoadingOverlay.svelte
│   │
│   ├── stores/
│   │   └── theme.svelte.ts         # $state-based theme with localStorage
│   │
│   └── utils/
│       ├── hash.ts                 # SHA-256 via Web Crypto API
│       └── layout.ts               # node position algorithm
│
└── routes/
    ├── +layout.svelte              # NavBar, ThemeToggle, slot
    ├── +layout.server.ts           # load session
    ├── +page.svelte                # "/" — InputSandbox
    ├── +page.server.ts             # form action: parse pipeline
    ├── canvas/
    │   ├── +page.svelte            # TopologyCanvas + Sidebar
    │   └── +page.ts                # client load: read hf_result cookie
    ├── history/
    │   ├── +layout.server.ts       # auth guard
    │   ├── +page.svelte            # paginated history cards
    │   └── +page.server.ts         # Drizzle query
    ├── api/
    │   └── favorite/+server.ts     # PATCH toggle is_favorited
    ├── login/+page.svelte
    └── auth/[...nextauth]/+server.ts
```

### 4.2 Request Flow (Parse Pipeline)

```
User submits sentence
  │
  ▼
+page.server.ts (form action)
  │  isHangulOnly() — fail 422 if not Korean
  │  hashSentence() — SHA-256 of normalized text
  │  redis.get(`hanflow:parsed:${hash}`)
  │    ├── HIT  → set hf_result cookie → redirect /canvas
  │    └── MISS → parseSentence(sentence)
  │                 ├── generateObject(anthropic, ParsedSentenceSchema)
  │                 └── fallback: generateObject(google, ParsedSentenceSchema)
  │              redis.setex(key, 604800, JSON.stringify(result))
  │              if logged in → db.insert(sentenceHistory)
  │              set hf_result cookie → redirect /canvas
  │
  ▼
/canvas +page.ts (client load)
  │  read hf_result cookie
  │  ParsedSentenceSchema.safeParse()
  └── return { parsedSentence }
```

---

## 5. Data Models

### 5.1 Zod Schema (`src/lib/schemas/sentence.ts`)

```typescript
TokenType = enum([
  'noun', 'pronoun', 'particle', 'verb', 'adjective',
  'adverb', 'conjunction', 'interjection', 'determiner',
  'suffix', 'ending', 'unknown'
])

ConjugationStep = { label: string, form: string, note?: string }

ConjugationChain = {
  dictionaryForm: string,   // 가다
  stem:           string,   // 가
  infix?:         string,   // vowel harmony infix
  politeSuffix:   string,   // 아요/어요
  politeForm:     string,   // 가요
  steps:          ConjugationStep[]
}

Token = {
  id:           string,       // "tok_0"
  value:        string,       // surface Hangul
  type:         TokenType,
  romanization: string,       // Revised Romanization
  gloss:        string,       // English meaning
  position:     number,       // 0-based index
  conjugation?: ConjugationChain
}

ParticleBridge = { particleTokenId: string, nounTokenId: string, relationLabel: string }

PhoneticNote = {
  phenomenon: enum(['batchim_assimilation','liaison','nasalization','aspiration','tensification','other']),
  description: string,
  tokenIds: string[]
}

GrammarNote = {
  structure:      enum(['SOV','SVO','OSV','topicComment','other']),
  explanation:    string,
  formalityLevel: enum(['formal','polite','informal','banmal'])
}

GlossaryEntry = {
  tokenId:          string,
  headword:         string,
  partOfSpeech:     string,
  definition:       string,
  exampleSentences: { korean: string, english: string }[]  // max 3
}

ParsedSentence = {
  originalText:    string,
  tokens:          Token[],
  particleBridges: ParticleBridge[],
  phoneticNotes:   PhoneticNote[],
  grammarNote:     GrammarNote,
  glossary:        GlossaryEntry[]
}
```

### 5.2 Drizzle Schema (`src/lib/server/db/schema.ts`)

**Auth.js required tables:** `user`, `account`, `session`, `verification_token`

**Application table:**
```
sentence_history
  id            uuid          PK, default random()
  user_id       text          FK → user.id (SET NULL on delete), nullable
  sentence_hash text          NOT NULL — SHA-256 content-addressed key
  sentence_text text          NOT NULL
  parsed_result jsonb         NOT NULL — ParsedSentence JSON
  is_favorited  boolean       NOT NULL, default false
  created_at    timestamp     NOT NULL, default now()

  indexes:
    sentence_history_user_id_idx  ON (user_id)
    sentence_history_hash_idx     ON (sentence_hash)
```

---

## 6. Canvas State Design (`canvas.state.svelte.ts`)

Svelte 5 rune-based factory function, passed via `setContext`:

```typescript
// IMPORTANT: use $state.raw for nodes/edges — avoids deep proxy conflict with @xyflow/svelte
let nodes = $state.raw<Node<CanvasNodeData>[]>(buildNodes(ps))
let edges = $state.raw<Edge[]>(buildEdges(ps))

// Interaction
let selectedTokenId = $state<string | null>(null)
let hoveredTokenId  = $state<string | null>(null)
let expandedVerbId  = $state<string | null>(null)
let sidebarOpen     = $state(false)
let activeSidebarTab = $state<'phonetic'|'grammar'|'glossary'>('phonetic')
let isMobile        = $state(false)  // set via matchMedia in TopologyCanvas onMount

// Key derived values
const particleBridgeEdges = $derived(/* filter bridges by hoveredTokenId */)
const visibleEdges = $derived([...edges, ...particleBridgeEdges])
const selectedToken = $derived(/* find token by selectedTokenId */)
```

**Context key:** `Symbol.for('canvas')` — used by all node/edge child components.

**ConjugationExpansion gotcha:** After expanding, call `updateNodeInternals(nodeId)` from `useSvelteFlow()` so SvelteFlow recalculates edge routing for the taller node.

---

## 7. Theme System

### CSS Custom Properties (`src/app.css`)

```css
:root, [data-theme="dark"] {
  --color-bg-canvas:     #0d0f14;
  --color-bg-surface:    #161b22;
  --color-bg-elevated:   #1e2430;
  --color-text-primary:  #e6edf3;
  --color-text-secondary:#8b949e;
  --color-node-noun:     #388bfd;   /* blue */
  --color-node-particle: #a371f7;   /* purple */
  --color-node-verb:     #56d364;   /* green */
  --color-node-modifier: #6e7681;   /* grey */
  --color-edge:          #30363d;
  --sidebar-width-desktop: 380px;
  --bottom-sheet-height: 60vh;
}

[data-theme="light"] {
  --color-bg-canvas:     #f0f2f5;
  --color-bg-surface:    #ffffff;
  --color-text-primary:  #1c2128;
  --color-node-noun:     #0969da;
  --color-node-particle: #8250df;
  --color-node-verb:     #1a7f37;
  --color-node-modifier: #6e7781;
  --color-edge:          #d0d7de;
}
```

### FOUC Prevention (`src/app.html`)

```html
<script>
  (function() {
    const t = localStorage.getItem('hanflow-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

### Theme Store (`src/lib/stores/theme.svelte.ts`)

`$state`-based singleton. `$effect.root` applies `data-theme` to `document.documentElement` and persists to `localStorage` on every change.

---

## 8. Auth.js v5 Configuration

- **Strategy:** JWT (stateless cookies) — avoids DB round-trip on every request
- **Providers:** GitHub, Google, Credentials (email + bcrypt password hash)
- **Adapter:** DrizzleAdapter with explicit table mapping to Drizzle schema
- **Session augmentation:** `session.user.id` added via `callbacks.session`
- **Protected routes:** `src/routes/history/+layout.server.ts` checks `locals.auth()` and redirects to `/login?callbackUrl=/history`
- **Auth.js catch-all:** `src/routes/auth/[...nextauth]/+server.ts`

---

## 9. Mobile-First Responsive Strategy

### Breakpoints
```css
/* Mobile-first defaults, then override */
@media (min-width: 768px)  { /* tablet  */ }
@media (min-width: 1024px) { /* desktop */ }
```

### Canvas Layout
| Viewport | Canvas | Sidebar |
|---|---|---|
| < 768px | 100vw, 60dvh | Bottom sheet (60vh, slides up) |
| 768–1023px | flex 65% | Right panel 35% |
| ≥ 1024px | fills remaining width | Fixed right drawer 380px |

### Touch Handling in @xyflow/svelte
- `onNodeClick` fires both `selectToken` + `hoverToken` on mobile
- `nodesDraggable={!state.isMobile}` prevents drag/scroll conflict
- `fitView` called on mount — full sentence visible without scrolling
- Node min-width: `80px` mobile / `120px` desktop via CSS

---

## 10. LLM Abstraction

### Model Registry (`src/lib/server/llm/index.ts`)
```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'

export const primaryModel  = anthropic('claude-3-5-haiku-20241022')
export const fallbackModel = google('gemini-2.0-flash')
```

### Parse Orchestration (`src/lib/server/llm/parse.ts`)
```typescript
export async function parseSentence(sentence: string): Promise<ParsedSentence> {
  try {
    const { object } = await generateObject({
      model: primaryModel,
      schema: ParsedSentenceSchema,
      system: buildSystemPrompt(),
      prompt: `Parse this Korean sentence: "${sentence}"`,
      temperature: 0.1,
    })
    return object
  } catch {
    // Gemini fallback
    const { object } = await generateObject({
      model: fallbackModel,
      schema: ParsedSentenceSchema,
      system: buildSystemPrompt(),
      prompt: `Parse this Korean sentence: "${sentence}"`,
      temperature: 0.1,
    })
    return object
  }
}
```

### Prompt Requirements (`src/lib/server/llm/prompt.ts`)
- Instruct model to match Zod schema field names verbatim
- Include one complete few-shot example (e.g., 저는 학교에 갑니다 fully parsed)
- Specify Revised Romanization (not McCune-Reischauer)
- Map 은/는/이/가/을/를 → TokenType `particle`
- Temperature 0.1 for determinism (cached results must be consistent)

### Redis Key Strategy
```typescript
// Normalize before hashing — ensures 가 (precomposed) === ㄱ+ㅏ (decomposed jamo)
const hash = await hashSentence(sentence)  // SHA-256 of text.trim().normalize('NFC')
const key  = `hanflow:parsed:${hash}`
await redis.setex(key, 60 * 60 * 24 * 7, JSON.stringify(parsed))  // 7-day TTL
```

---

## 11. Environment Variables

```bash
# Phase 1
NODE_ENV=development

# Phase 2 — Auth + DB
DATABASE_URL=postgresql://hanflow:secret@localhost:5432/hanflow
AUTH_SECRET=                         # openssl rand -base64 32
AUTH_TRUST_HOST=true
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Phase 3 — LLM + Redis
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Phase 7 — Production (Railway auto-injects DATABASE_URL, REDIS_URL, PORT)
PUBLIC_APP_URL=https://<your-app>.railway.app
```

---

## 12. Key Dependencies

```json
{
  "dependencies": {
    "@auth/drizzle-adapter": "^1.x",
    "@auth/sveltekit": "^1.x",
    "@ai-sdk/anthropic": "^1.x",
    "@ai-sdk/google": "^1.x",
    "@sveltejs/adapter-node": "^5.x",
    "@sveltejs/kit": "^2.x",
    "@xyflow/svelte": "^0.1.x",
    "ai": "^4.x",
    "drizzle-orm": "^0.40.x",
    "ioredis": "^5.x",
    "pg": "^8.x",
    "svelte": "^5.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "@types/pg": "^8.x",
    "drizzle-kit": "^0.31.x",
    "svelte-check": "^4.x",
    "typescript": "^5.x",
    "vite": "^6.x"
  }
}
```

---

## 13. Implementation Phases Summary

| Phase | Deliverable | Key Learning |
|---|---|---|
| 1 | Scaffold + Theme toggle | SvelteKit, Svelte 5 runes, CSS custom properties |
| 2 | Auth + DB (login, protected routes) | Drizzle ORM, Auth.js v5, OAuth |
| 3 | LLM pipeline + Redis cache (JSON output) | Vercel AI SDK, Zod, Redis |
| 4 | Topology Canvas (nodes, bridges, conjugation) | @xyflow/svelte, advanced runes, SVG |
| 5 | Deep Context Sidebar (drawer + bottom sheet) | CSS transitions, responsive components |
| 6 | Sentence History + favorites | Drizzle queries, load functions, optimistic UI |
| 7 | Polish + Railway deployment | Production deploy, error boundaries, Railway |

Each phase is self-contained and ships a working app. Full dependency chain: 1 → 2 → 3 → 4 → 5 → 6 → 7.
