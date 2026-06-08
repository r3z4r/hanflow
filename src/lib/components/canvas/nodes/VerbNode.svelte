<script lang="ts">
  import TokenNode from './TokenNode.svelte';
  import { getCanvasContext } from '../canvas.state.svelte';
  import type { CanvasNodeData } from '../canvas.state.svelte';

  let { data, selected = false }: { data: CanvasNodeData; selected?: boolean } = $props();
  const state = getCanvasContext();

  function handleClick() {
    state.expandVerb(data.token.id === state.expandedVerbId ? null : data.token.id);
  }
</script>

<div onclick={handleClick} role="button" tabindex="0"
     onkeydown={(e) => e.key === 'Enter' && handleClick()}>
  <TokenNode {data} {selected} />
</div>
