<script lang="ts">
  import { getBezierPath, EdgeLabel, BaseEdge } from '@xyflow/svelte';
  import type { EdgeProps } from '@xyflow/svelte';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd
  }: EdgeProps = $props();

  const pathParams = $derived(
    getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  );
  // getBezierPath returns [path, labelX, labelY, offsetX, offsetY]
  const edgePath = $derived(pathParams[0]);
  const labelX = $derived(pathParams[1]);
  const labelY = $derived(pathParams[2]);
</script>

<BaseEdge
  {id}
  path={edgePath}
  {markerEnd}
  style="stroke: var(--color-node-particle); stroke-width: 2; stroke-dasharray: 6 3; animation: dash 1s linear infinite;"
/>

{#if data?.relationLabel}
  <EdgeLabel x={labelX} y={labelY}>
    <div class="edge-label">
      {data.relationLabel}
    </div>
  </EdgeLabel>
{/if}

<style>
  /* .svelte-flow__edge-path styling is handled inline via style prop on BaseEdge */

  .edge-label {
    position: absolute;
    pointer-events: none;
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--color-node-particle);
    background: var(--color-bg-surface);
    border: 1px solid color-mix(in srgb, var(--color-node-particle) 40%, transparent);
    border-radius: 4px;
    padding: 1px 5px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>
