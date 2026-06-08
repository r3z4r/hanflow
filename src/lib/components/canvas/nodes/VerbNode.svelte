<script lang="ts">
  import TokenNode from './TokenNode.svelte';
  import ConjugationExpansion from './ConjugationExpansion.svelte';
  import { getCanvasContext } from '../canvas.state.svelte';
  import type { CanvasNodeData } from '../canvas.state.svelte';

  let { data, id = '', selected = false }: { data: CanvasNodeData; id?: string; selected?: boolean } = $props();
  const state = getCanvasContext();

  const isExpanded = $derived(state.expandedVerbId === data.token.id);

  function handleClick() {
    state.expandVerb(isExpanded ? null : data.token.id);
  }
</script>

<div class="verb-wrapper" onclick={handleClick} role="button" tabindex="0"
     onkeydown={(e) => e.key === 'Enter' && handleClick()}>
  <TokenNode {data} {selected} />
  {#if isExpanded && data.token.conjugation}
    <ConjugationExpansion nodeId={id} conjugation={data.token.conjugation} />
  {/if}
</div>

<style>
  .verb-wrapper {
    display: flex;
    flex-direction: column;
    cursor: pointer;
  }
</style>
