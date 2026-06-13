import { getContext, setContext } from 'svelte';
import type { Node, Edge } from '@xyflow/svelte';
import type { Token, ParsedSentence } from '$lib/schemas/sentence';

// ─── Node data type ──────────────────────────────────────────────────────────

export interface CanvasNodeData extends Record<string, unknown> {
  token: Token;
  isSelected: boolean;
  isHovered: boolean;
  isExpanded: boolean; // for verb conjugation expansion
}

// ─── Sidebar types ───────────────────────────────────────────────────────────

export type SidebarTab = 'phonetic' | 'grammar' | 'glossary';

// ─── Build helpers ───────────────────────────────────────────────────────────

function buildNodes(parsedSentence: ParsedSentence): Node<CanvasNodeData>[] {
  return parsedSentence.tokens.map((token) => ({
    id: token.id,
    type: token.type, // matches nodeTypes key in TopologyCanvas
    position: { x: token.position * 160, y: 200 },
    data: { token, isSelected: false, isHovered: false, isExpanded: false }
  }));
}

// ─── State factory ───────────────────────────────────────────────────────────

export function createCanvasState(parsedSentence: ParsedSentence) {
  // @xyflow/svelte requires $state.raw to avoid deep proxy conflicts
  let nodes = $state.raw<Node<CanvasNodeData>[]>(buildNodes(parsedSentence));
  let edges = $state.raw<Edge[]>([]);

  // Interaction state
  let selectedTokenId = $state<string | null>(null);
  let hoveredTokenId = $state<string | null>(null);
  let expandedVerbId = $state<string | null>(null);
  let isMobile = $state(false);

  // Sidebar state
  let sidebarOpen = $state(false);
  let activeSidebarTab = $state<SidebarTab>('glossary');

  // Derived particle bridge edges — only shown while a particle is hovered
  const particleBridgeEdges = $derived(
    hoveredTokenId
      ? parsedSentence.particleBridges
          .filter((b) => b.particleTokenId === hoveredTokenId)
          .map((b) => ({
            id: `bridge-${b.particleTokenId}-${b.nounTokenId}`,
            source: b.particleTokenId,
            target: b.nounTokenId,
            type: 'particleBridge',
            animated: true,
            data: { relationLabel: b.relationLabel }
          }))
      : []
  );

  const visibleEdges = $derived([...edges, ...particleBridgeEdges]);

  // Derived sidebar content — keyed off the selected token
  const selectedToken = $derived(
    selectedTokenId ? parsedSentence.tokens.find((t) => t.id === selectedTokenId) ?? null : null
  );

  const selectedGlossaryEntry = $derived(
    selectedTokenId
      ? parsedSentence.glossary.find((g) => g.tokenId === selectedTokenId) ?? null
      : null
  );

  const relevantPhoneticNotes = $derived.by(() => {
    const tokenId = selectedTokenId;
    return tokenId
      ? parsedSentence.phoneticNotes.filter((n) => n.tokenIds.includes(tokenId))
      : parsedSentence.phoneticNotes;
  });

  // ── Actions ────────────────────────────────────────────────────────────────

  function selectToken(id: string | null) {
    selectedTokenId = id;
    if (id !== null) {
      sidebarOpen = true;
    }
    // On mobile, mouseenter doesn't fire — mirror hover from selection
    if (isMobile) {
      hoveredTokenId = id;
    }
  }

  function hoverToken(id: string | null) {
    hoveredTokenId = id;
  }

  function expandVerb(id: string | null) {
    expandedVerbId = id;
  }

  function setMobile(v: boolean) {
    isMobile = v;
  }

  function setNodes(updated: Node<CanvasNodeData>[]) {
    nodes = updated;
  }

  function closeSidebar() {
    sidebarOpen = false;
    selectedTokenId = null;
  }

  function setSidebarTab(tab: SidebarTab) {
    activeSidebarTab = tab;
  }

  return {
    // Reactive state (read via getters so consumers see live values)
    get nodes() { return nodes; },
    get visibleEdges() { return visibleEdges; },
    get selectedTokenId() { return selectedTokenId; },
    get hoveredTokenId() { return hoveredTokenId; },
    get expandedVerbId() { return expandedVerbId; },
    get isMobile() { return isMobile; },
    get sidebarOpen() { return sidebarOpen; },
    get activeSidebarTab() { return activeSidebarTab; },
    get selectedToken() { return selectedToken; },
    get selectedGlossaryEntry() { return selectedGlossaryEntry; },
    get relevantPhoneticNotes() { return relevantPhoneticNotes; },
    get grammarNote() { return parsedSentence.grammarNote; },

    // Actions
    selectToken,
    hoverToken,
    expandVerb,
    setMobile,
    setNodes,
    closeSidebar,
    setSidebarTab
  };
}

// ─── Context helpers ─────────────────────────────────────────────────────────

const CANVAS_KEY = Symbol.for('canvas');

export type CanvasState = ReturnType<typeof createCanvasState>;

export function setCanvasContext(state: CanvasState) {
  setContext(CANVAS_KEY, state);
}

export function getCanvasContext(): CanvasState {
  return getContext(CANVAS_KEY);
}
