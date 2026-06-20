<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import SpeakButton from '$lib/components/ui/SpeakButton.svelte';
  import { display } from '$lib/utils/display.svelte';
  import { getCanvasContext } from '../canvas.state.svelte';
  import type { CanvasNodeData } from '../canvas.state.svelte';

  let { data, selected = false }: { data: CanvasNodeData; selected?: boolean } = $props();

  const state = getCanvasContext();

  // xyflow selects a node on keyboard Enter/Space but does not fire onnodeclick,
  // so mirror selection into our state to open the detail sidebar for keyboard users.
  $effect(() => {
    if (selected) state.selectToken(data.token.id);
  });

  // Map token type to CSS custom property name
  function colorVar(type: string): string {
    if (['noun', 'pronoun', 'determiner'].includes(type)) return '--color-node-noun';
    if (['particle', 'suffix', 'ending'].includes(type)) return '--color-node-particle';
    if (['verb', 'adjective', 'adverb'].includes(type)) return '--color-node-verb';
    return '--color-node-modifier';
  }

  const color = $derived(`var(${colorVar(data.token.type)})`);
</script>

<div class="token-node" class:selected style="--node-color: {color}">
  {#if !data.isFirst}
    <Handle type="target" position={Position.Left} id="target-left" />
    <Handle type="source" position={Position.Left} id="source-left" />
  {/if}
  <div class="node-value">{data.token.value}</div>
  {#if display.glossVisible}
    <div class="node-gloss">{data.token.gloss}</div>
  {/if}
  <div class="node-actions">
    <SpeakButton text={data.token.value} label="Play pronunciation of {data.token.value}" />
  </div>
  {#if !data.isLast}
    <Handle type="source" position={Position.Right} id="source-right" />
    <Handle type="target" position={Position.Right} id="target-right" />
  {/if}
</div>

<style>
  .token-node {
    position: relative;
    min-width: var(--node-min-width, 80px);
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--color-bg-elevated);
    border: 1.5px solid var(--node-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    transition: box-shadow 150ms ease, transform 150ms ease;
  }
  .token-node:hover, .token-node.selected {
    box-shadow: 0 0 0 2px var(--node-color);
    transform: translateY(-1px);
  }
  .node-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--node-color);
  }
  .node-gloss {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    text-align: center;
    line-height: 1.3;
  }
  .node-actions {
    position: absolute;
    /* Inset from the corner so the icon stays inside the node border instead of
       overlapping it. */
    top: 2px;
    right: 2px;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .token-node {
      transition: none;
    }
    .token-node:hover,
    .token-node.selected {
      transform: none;
    }
  }
</style>
