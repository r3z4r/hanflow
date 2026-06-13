<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  import { getCanvasContext } from './canvas.state.svelte';

  const { fitView } = useSvelteFlow();
  const state = getCanvasContext();

  // Re-fit the viewport whenever the sidebar/bottom sheet opens or closes,
  // after the CSS resize transition (300ms) finishes.
  $effect(() => {
    state.sidebarOpen;
    state.isMobile;

    const timer = setTimeout(() => fitView({ duration: 300 }), 320);
    return () => clearTimeout(timer);
  });
</script>
