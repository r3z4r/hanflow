<script lang="ts">
  import { useUpdateNodeInternals } from '@xyflow/svelte';
  import type { ConjugationChain } from '$lib/schemas/sentence';

  let { nodeId, conjugation }: { nodeId: string; conjugation: ConjugationChain } = $props();

  const updateNodeInternals = useUpdateNodeInternals();

  $effect(() => {
    // Tell xyflow to reflow edges after this component mounts/updates
    updateNodeInternals(nodeId);
  });
</script>

<div class="conjugation">
  <div class="conj-header">Conjugation</div>
  {#each conjugation.steps as step}
    <div class="conj-step">
      <span class="step-label">{step.label}</span>
      <span class="step-form">{step.form}</span>
      {#if step.note}
        <span class="step-note">{step.note}</span>
      {/if}
    </div>
  {/each}
  <div class="conj-footer">
    <span class="dict-form">{conjugation.dictionaryForm}</span>
    <span class="arrow">→</span>
    <span class="polite-form">{conjugation.politeForm}</span>
  </div>
</div>

<style>
  .conjugation {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--color-edge);
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 160px;
  }
  .conj-header {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }
  .conj-step {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 3px 6px;
    background: var(--color-bg-canvas);
    border-radius: 4px;
  }
  .step-label {
    font-size: 0.5625rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .step-form {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-node-verb);
  }
  .step-note {
    font-size: 0.5625rem;
    color: var(--color-text-secondary);
    font-style: italic;
    line-height: 1.4;
  }
  .conj-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 4px;
  }
  .dict-form, .polite-form {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-node-verb);
  }
  .arrow {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
</style>
