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

  // ── Actions ────────────────────────────────────────────────────────────────

  function selectToken(id: string | null) {
    selectedTokenId = id;
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

  return {
    // Reactive state (read via getters so consumers see live values)
    get nodes() { return nodes; },
    get visibleEdges() { return visibleEdges; },
    get selectedTokenId() { return selectedTokenId; },
    get hoveredTokenId() { return hoveredTokenId; },
    get expandedVerbId() { return expandedVerbId; },
    get isMobile() { return isMobile; },

    // Actions
    selectToken,
    hoverToken,
    expandVerb,
    setMobile
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
