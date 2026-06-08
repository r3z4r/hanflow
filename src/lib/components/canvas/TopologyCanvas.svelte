<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SvelteFlow, Controls, Background, BackgroundVariant } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { createCanvasState, setCanvasContext } from './canvas.state.svelte';
  import type { ParsedSentence } from '$lib/schemas/sentence';
  import TokenNode from './nodes/TokenNode.svelte';
  import NounNode from './nodes/NounNode.svelte';
  import ParticleNode from './nodes/ParticleNode.svelte';
  import VerbNode from './nodes/VerbNode.svelte';
  import ParticleBridgeEdge from './edges/ParticleBridgeEdge.svelte';

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
    <Controls />
    <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
  </SvelteFlow>
</div>

<style>
  .canvas-wrapper {
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

  :global(.svelte-flow) {
    background: var(--color-bg-canvas);
  }
</style>
