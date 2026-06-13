<script lang="ts">
  import { getCanvasContext } from '$lib/components/canvas/canvas.state.svelte';

  const state = getCanvasContext();

  function humanizePhenomenon(phenomenon: string): string {
    return phenomenon
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<section class="phonetic-section">
  <div class="section-header">Phonetic Notes</div>

  {#if state.relevantPhoneticNotes.length === 0}
    <p class="empty-state">No phonetic notes for this sentence.</p>
  {:else}
    {#if state.selectedToken}
      <p class="hint">Showing notes for {state.selectedToken.value}</p>
    {/if}

    <div class="notes-list">
      {#each state.relevantPhoneticNotes as note}
        <div class="note-card">
          <span class="phenomenon-label">{humanizePhenomenon(note.phenomenon)}</span>
          <p class="description">{note.description}</p>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .phonetic-section {
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

  .empty-state {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .notes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .note-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.625rem;
    background: var(--color-bg-canvas);
    border-radius: var(--radius-node);
  }

  .phenomenon-label {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-node-particle);
  }

  .description {
    font-size: 0.8125rem;
    color: var(--color-text-primary);
    line-height: 1.5;
  }
</style>
