<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import SpeakButton from '$lib/components/ui/SpeakButton.svelte';
  import type { CanvasNodeData } from '../canvas.state.svelte';

  let { data, selected = false }: { data: CanvasNodeData; selected?: boolean } = $props();

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
  <Handle type="target" position={Position.Left} id="target-left" />
  <Handle type="source" position={Position.Left} id="source-left" />
  <div class="node-value">{data.token.value}</div>
  <div class="node-gloss">{data.token.gloss}</div>
  <div class="node-actions">
    <SpeakButton text={data.token.value} label="Play pronunciation of {data.token.value}" />
  </div>
  <Handle type="source" position={Position.Right} id="source-right" />
  <Handle type="target" position={Position.Right} id="target-right" />
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
    /* Sits in the corner, partially overlapping the border so it stays clear
       of the centered .node-value text even on the narrowest mobile nodes. */
    top: -4px;
    right: -4px;
    z-index: 1;
  }
</style>
