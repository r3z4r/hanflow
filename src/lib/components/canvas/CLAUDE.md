# Topology Canvas

Interactive node graph at `/canvas`, built on `@xyflow/svelte` v1. One node per token in
`ParsedSentence.tokens`, color-coded by grammatical type, with hover-triggered "particle
bridge" edges and click-to-expand verb conjugation.

## Files

- `TopologyCanvas.svelte` — `<SvelteFlow>` wrapper. Owns the `nodeTypes`/`edgeTypes`
  registries, mobile detection, and top-level event wiring (click/hover → state).
- `canvas.state.svelte.ts` — runes-based state factory, shared via Svelte context.
- `FitViewOnLayoutChange.svelte` — headless helper, re-fits the viewport when the
  sidebar opens/closes.
- `CanvasLegend.svelte` — color-coding key (noun / particle / verb / other), rendered in
  a bottom-left `<Panel>`. Its type→color groups must stay in sync with
  `TokenNode.svelte`'s `colorVar()` and the `--color-node-*` tokens in `app.css`.
- `nodes/`
  - `TokenNode.svelte` — base node: value, gloss, color border by type, `SpeakButton`
    in a `.node-actions` corner badge, and the 4 handles described below.
  - `NounNode.svelte`, `ParticleNode.svelte` — thin pass-throughs to `TokenNode`. They
    exist purely so `nodeTypes` can route different token types to different
    components later; today they render identically to `TokenNode`. Add
    type-specific visuals here if needed.
  - `VerbNode.svelte` — wraps `TokenNode` in a clickable `.verb-wrapper` that toggles
    `state.expandedVerbId` and conditionally renders `ConjugationExpansion`.
  - `ConjugationExpansion.svelte` — renders `conjugation.steps` + dictionary→polite
    summary. See "updateNodeInternals" gotcha below.
- `edges/ParticleBridgeEdge.svelte` — custom animated SVG cubic-Bezier edge
  (`stroke-dasharray` + `dash` keyframe from `app.css`), optional `relationLabel`
  rendered via `<EdgeLabel>`.

## State (`canvas.state.svelte.ts`)

- **`$state.raw` for `nodes`/`edges`** — required by `@xyflow/svelte`; a deep `$state`
  proxy conflicts with xyflow's internal node mutation. Replace the whole array via
  `setNodes()`, never mutate elements in place.
- Context key: `Symbol.for('canvas')` via `setCanvasContext`/`getCanvasContext`. Every
  node/edge/sidebar component reads this — it's the only way they access
  `parsedSentence`, selection state, etc.
- `particleBridgeEdges` is `$derived` from `hoveredTokenId` — a bridge edge only
  exists while its particle token is hovered, then gets spread into `visibleEdges`
  alongside the base `edges` array (currently always empty — all real edges are
  hover-derived bridges). Bridge construction hardcodes handle IDs `source-left` /
  `target-right` (see "Handle IDs" below).
- `selectToken(id)`: on mobile, also sets `hoveredTokenId = id` because `pointerenter`
  never fires on touch — this is what makes particle bridges appear on tap, not just
  hover.
- `relevantPhoneticNotes` (`$derived.by`): filters `phoneticNotes` to the selected
  token's `tokenIds`, or returns *all* notes when nothing is selected.

## TopologyCanvas.svelte

- `createCanvasState(parsedSentence)` is wrapped in `untrack()` — state is captured
  **once** at mount. If a parent ever needs to switch to a different sentence, it must
  remount this component (e.g. `{#key sentenceHash}`); state will not update from new
  props.
- `nodeTypes` keys are `Token['type']` values (`noun`, `pronoun`, `particle`, `verb`,
  ...). Adding a new `TokenType` to the Zod schema (`src/lib/schemas/sentence.ts`)
  requires either mapping it here or accepting the `unknown`/`TokenNode` fallback.
- Mobile breakpoint: `matchMedia('(max-width: 768px)')` → `state.setMobile(...)`,
  drives `nodesDraggable={!isMobile}` and the Sidebar-vs-BottomSheet choice in
  `TopologyCanvas`'s template (see `src/lib/components/sidebar/CLAUDE.md`).

## Handle IDs

`TokenNode` exposes up to 4 handles: `target-left`, `source-left` (left side),
`source-right`, `target-right` (right side). The **first** node omits its left pair and
the **last** node omits its right pair (gated on `data.isFirst`/`data.isLast` from
`buildNodes`) — those outer edges never carry a connection in Korean's noun→particle
order, so the stray handle dots are hidden. `ParticleBridgeEdge` connects a particle's
`source-left` to its governing noun's `target-right` (`canvas.state.svelte.ts`,
`particleBridgeEdges`); since a particle always follows its noun, the noun is never the
last node, so dropping the last node's right handles is safe. If you change handle
IDs/positions on `TokenNode`, update that bridge construction to match.

Bridge edges set `zIndex: 1001` so their `EdgeLabel` (which inherits the edge's zIndex)
paints above the node boxes — xyflow renders the edge-labels container *before* the
nodes container, so without it the relation label sits under the nodes.

## Conjugation expansion gotcha

`ConjugationExpansion.svelte` calls `useUpdateNodeInternals()` inside an `$effect` on
mount/update. Without this, xyflow doesn't know `VerbNode` grew taller and edges will
route through the old (shorter) node bounds. Any future component that changes a
node's rendered height on the fly needs the same call.

## FitViewOnLayoutChange

No markup. Its `$effect` reads `state.sidebarOpen` and `state.isMobile`, then calls
`fitView({ duration: 300 })` after a **320ms** `setTimeout` — 20ms after the sidebar's
CSS transition finishes. Both `DeepContextSidebar` and `BottomSheet` transition over
`300ms cubic-bezier(0.32, 0.72, 0, 1)`. If that transition duration ever changes,
update this timeout too.

## Adding a new node type

1. Add the type to `TokenTypeSchema` in `src/lib/schemas/sentence.ts` and update the
   LLM prompt (`src/lib/server/llm/CLAUDE.md`).
2. Create `nodes/<X>Node.svelte` (wrap `TokenNode` for shared styling, or build
   standalone — keep the 4 handle IDs if it should participate in particle bridges).
3. Register it in `TopologyCanvas.svelte`'s `nodeTypes`.
4. Add a `colorVar()` mapping in `TokenNode.svelte` and a corresponding
   `--color-node-*` pair in `src/app.css` for both `[data-theme='dark']` and
   `[data-theme='light']`.
