<script lang="ts">
  import { getCanvasContext } from '$lib/components/canvas/canvas.state.svelte';
  import SpeakButton from '$lib/components/ui/SpeakButton.svelte';

  const state = getCanvasContext();
</script>

<section class="glossary-section">
  <div class="section-header">Glossary</div>

  {#if state.selectedGlossaryEntry === null}
    <p class="empty-state">Select a word on the canvas to see its definition.</p>
  {:else}
    {@const entry = state.selectedGlossaryEntry}
    <div class="headword-row">
      <span class="headword">{entry.headword}</span>
      <span class="pos-badge">{entry.partOfSpeech}</span>
    </div>

    <p class="definition">{entry.definition}</p>

    {#if entry.exampleSentences.length > 0}
      <div class="examples">
        {#each entry.exampleSentences as example}
          <div class="example">
            <div class="example-korean-row">
              <p class="example-korean">{example.korean}</p>
              <div class="example-actions">
                <SpeakButton text={example.korean} label="Play pronunciation of {example.korean}" />
              </div>
            </div>
            <p class="example-english">{example.english}</p>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .glossary-section {
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

  .headword-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .headword {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .pos-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1875rem 0.5rem;
    border-radius: 999px;
    background: var(--color-bg-canvas);
    color: var(--color-node-modifier);
  }

  .definition {
    font-size: 0.8125rem;
    color: var(--color-text-primary);
    line-height: 1.5;
  }

  .examples {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .example {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.5rem 0.625rem;
    background: var(--color-bg-canvas);
    border-radius: var(--radius-node);
  }

  .example-korean-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .example-actions {
    flex-shrink: 0;
  }

  .example-korean {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .example-english {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }
</style>
