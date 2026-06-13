<script lang="ts">
  import { getCanvasContext } from '$lib/components/canvas/canvas.state.svelte';

  const state = getCanvasContext();
</script>

<section class="grammar-section">
  <div class="section-header">Grammar</div>

  <div class="badges">
    <span class="badge badge-structure">{state.grammarNote.structure}</span>
    <span class="badge badge-formality">{state.grammarNote.formalityLevel}</span>
  </div>

  <p class="explanation">{state.grammarNote.explanation}</p>
</section>

<style>
  .grammar-section {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-header {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .badges {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1875rem 0.5rem;
    border-radius: 999px;
    background: var(--color-bg-canvas);
  }

  .badge-structure {
    color: var(--color-node-noun);
  }

  .badge-formality {
    color: var(--color-node-verb);
  }

  .explanation {
    font-size: 0.8125rem;
    color: var(--color-text-primary);
    line-height: 1.5;
  }
</style>
