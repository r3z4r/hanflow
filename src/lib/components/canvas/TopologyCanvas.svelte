<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SvelteFlow, Background, BackgroundVariant, Panel, Controls } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { createCanvasState, setCanvasContext } from './canvas.state.svelte';
  import type { ParsedSentence } from '$lib/schemas/sentence';
  import TokenNode from './nodes/TokenNode.svelte';
  import NounNode from './nodes/NounNode.svelte';
  import ParticleNode from './nodes/ParticleNode.svelte';
  import VerbNode from './nodes/VerbNode.svelte';
  import ParticleBridgeEdge from './edges/ParticleBridgeEdge.svelte';
  import CanvasLegend from './CanvasLegend.svelte';
  import CanvasCoachmark from './CanvasCoachmark.svelte';
  import DeepContextSidebar from '../sidebar/DeepContextSidebar.svelte';
  import BottomSheet from '../sidebar/BottomSheet.svelte';
  import FitViewOnLayoutChange from './FitViewOnLayoutChange.svelte';

  let { parsedSentence }: { parsedSentence: ParsedSentence } = $props();

  // Canvas state is created once per mount. The parent should key this component
  // on the sentence ID so it re-mounts rather than mutating parsedSentence.
  // untrack() signals to Svelte that capturing the initial prop value is intentional.
  const state = untrack(() => createCanvasState(parsedSentence));
  setCanvasContext(state);

  // Node type registry — keys match token.type values
  const nodeTypes = {
    noun: NounNode,
    pronoun: NounNode,
    determiner: NounNode,
    particle: ParticleNode,
    suffix: ParticleNode,
    ending: ParticleNode,
    verb: VerbNode,
    adjective: VerbNode,
    adverb: VerbNode,
    conjunction: TokenNode,
    interjection: TokenNode,
    unknown: TokenNode,
  };

  const edgeTypes = {
    particleBridge: ParticleBridgeEdge,
  };

  // Mobile detection
  onMount(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    state.setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => state.setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });
</script>

<div class="canvas-wrapper">
  <div class="flow-area" class:sidebar-open={state.sidebarOpen && !state.isMobile}>
    <SvelteFlow
      bind:nodes={() => state.nodes, state.setNodes}
      edges={state.visibleEdges}
      {nodeTypes}
      {edgeTypes}
      nodesDraggable={!state.isMobile}
      fitView
      onnodeclick={({ node }) => state.selectToken(node.id)}
      onnodepointerenter={({ node }) => state.hoverToken(node.id)}
      onnodepointerleave={() => state.hoverToken(null)}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={0} />
      <Controls showLock={false} />
      <Panel position="top-right">
        <button
          type="button"
          class="bridge-toggle"
          class:active={state.showAllBridges}
          aria-pressed={state.showAllBridges}
          onclick={() => state.toggleAllBridges()}
        >
          Show connections
        </button>
      </Panel>
      <Panel position="bottom-left">
        <CanvasLegend />
      </Panel>
      <FitViewOnLayoutChange />
    </SvelteFlow>
    <CanvasCoachmark />
  </div>

  {#if state.isMobile}
    <BottomSheet />
  {:else}
    <DeepContextSidebar />
  {/if}
</div>

<style>
  .canvas-wrapper {
    position: relative;
    width: 100%;
    height: 60dvh;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-edge);
  }

  @media (min-width: 768px) {
    .canvas-wrapper {
      height: 100%;
    }
  }

  .flow-area {
    position: absolute;
    inset: 0;
    transition: right 300ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .flow-area.sidebar-open {
    right: var(--sidebar-width-desktop);
  }

  :global(.svelte-flow) {
    background: var(--color-bg-canvas);
  }

  .bridge-toggle {
    padding: 0.375rem 0.75rem;
    background: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
    border: 1px solid var(--color-edge);
    border-radius: 8px;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
  }

  .bridge-toggle:hover {
    color: var(--color-text-primary);
    border-color: var(--color-accent-primary);
  }

  .bridge-toggle.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: #fff;
  }

  /* Theme the xyflow zoom/pan controls to match dark/light tokens. */
  :global(.svelte-flow__controls) {
    box-shadow: none;
  }

  :global(.svelte-flow__controls-button) {
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-edge);
  }

  :global(.svelte-flow__controls-button:hover) {
    background: var(--color-bg-elevated);
  }

  :global(.svelte-flow__controls-button svg) {
    fill: var(--color-text-secondary);
  }

  /* Visible keyboard focus ring on nodes (xyflow makes them Tab-focusable). */
  :global(.svelte-flow__node:focus-visible) {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 3px;
    border-radius: var(--radius-node);
  }

  @media (prefers-reduced-motion: reduce) {
    .flow-area {
      transition: none;
    }
  }
</style>
