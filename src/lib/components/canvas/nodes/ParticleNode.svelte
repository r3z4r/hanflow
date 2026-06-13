<script lang="ts">
  import TokenNode from './TokenNode.svelte';
  import type { CanvasNodeData } from '../canvas.state.svelte';
  let { data, selected = false }: { data: CanvasNodeData; selected?: boolean } = $props();
</script>

<TokenNode {data} {selected} />
