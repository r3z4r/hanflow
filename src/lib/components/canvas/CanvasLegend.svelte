<script lang="ts">
  // Mirrors the type → color grouping in TokenNode.svelte's colorVar().
  const items = [
    { label: 'Noun', colorVar: '--color-node-noun' },
    { label: 'Particle', colorVar: '--color-node-particle' },
    { label: 'Verb', colorVar: '--color-node-verb' },
    { label: 'Other', colorVar: '--color-node-modifier' }
  ];
</script>

<ul class="legend" aria-label="Node colour legend">
  {#each items as item (item.colorVar)}
    <li class="legend-item">
      <span class="swatch" style="background: var({item.colorVar})" aria-hidden="true"></span>
      {item.label}
    </li>
  {/each}
</ul>

<style>
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem 0.75rem;
    margin: 0;
    padding: 0.5rem 0.625rem;
    list-style: none;
    background: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
    border: 1px solid var(--color-edge);
    border-radius: 8px;
    backdrop-filter: blur(4px);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
  }

  .swatch {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 3px;
    flex-shrink: 0;
  }
</style>
