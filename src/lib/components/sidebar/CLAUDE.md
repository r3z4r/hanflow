# Deep Context Sidebar

Shows Phonetic / Grammar / Glossary detail for the currently selected canvas token.
`TopologyCanvas` picks one of two implementations based on `state.isMobile`:

- `DeepContextSidebar.svelte` — desktop right drawer. `transform: translateX(100% → 0)`,
  fixed width `var(--sidebar-width-desktop)` (380px).
- `BottomSheet.svelte` — mobile sheet. `transform: translateY(100% → 0)`,
  `border-radius: 16px 16px 0 0`, `height: var(--bottom-sheet-height, 60vh)`,
  `-webkit-overflow-scrolling: touch`.

**These two files are intentionally near-duplicates** (same header/tablist/
`.selected-token-info` markup and most CSS, different positioning + transition axis) —
built per-breakpoint per the original design spec rather than parameterized. If you
change the tab bar, header, or selected-token display, change both files. Both
transition over **300ms `cubic-bezier(0.32, 0.72, 0, 1)`** —
`src/lib/components/canvas/FitViewOnLayoutChange.svelte` depends on this exact
duration to re-fit the canvas after the transition ends.

## Tabs

`state.activeSidebarTab: 'glossary' | 'grammar' | 'phonetic'`
(`canvas.state.svelte.ts`), default `'glossary'`. Displayed order is Glossary,
Grammar, Phonetic in both sidebar variants.

- `GlossarySection.svelte` — reads `state.selectedGlossaryEntry` (matched by
  `tokenId`). Renders headword/POS/definition + up to 3 example sentences (schema
  caps at 3). Each example's Korean text has a `SpeakButton` inside an
  `.example-actions` wrapper, nested in `.example-korean-row` — follow this structure
  for any new per-example controls (see root `CLAUDE.md`'s `*-actions` convention).
- `GrammarSection.svelte` — reads `state.grammarNote`. This is **sentence-wide**, not
  per-token — content doesn't change based on `selectedTokenId`.
- `PhoneticSection.svelte` — reads `state.relevantPhoneticNotes`
  (`$derived.by` in `canvas.state.svelte.ts`): filtered to the selected token's
  `tokenIds` when something is selected, otherwise *all* phonetic notes for the
  sentence.

## Opening / closing

There's no independent "sidebar open" toggle — it's entirely driven by token
selection: `state.selectToken(id)` sets `sidebarOpen = true`;
`state.closeSidebar()` resets both `sidebarOpen` and `selectedTokenId` together.
