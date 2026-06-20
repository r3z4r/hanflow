<script lang="ts">
  import { onMount } from 'svelte';

  const STORAGE_KEY = 'hanflow:coachmark-seen';

  const tips = [
    { icon: '🎨', text: 'Colors show each word’s type — see the legend.' },
    { icon: '👆', text: 'Tap a word for its details and pronunciation.' },
    { icon: '🔗', text: 'Turn on “Show connections” to see how particles link words.' }
  ];

  let visible = $state(false);
  let dismissButton = $state<HTMLButtonElement | null>(null);

  onMount(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      seen = false;
    }
    visible = !seen;
  });

  // Move focus to the primary action when the dialog opens.
  $effect(() => {
    if (visible) dismissButton?.focus();
  });

  function dismiss() {
    visible = false;
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode — the coachmark may reappear next visit, which is acceptable */
    }
  }
</script>

<svelte:window onkeydown={(e) => visible && e.key === 'Escape' && dismiss()} />

{#if visible}
  <div class="coachmark-root">
    <button type="button" class="coachmark-backdrop" aria-label="Dismiss tips" onclick={dismiss}
    ></button>
    <div class="coachmark-card" role="dialog" aria-modal="true" aria-label="How to use the canvas">
      <h2 class="coachmark-title">Welcome 👋</h2>
      <ul class="coachmark-tips">
        {#each tips as tip (tip.text)}
          <li>
            <span class="coachmark-icon" aria-hidden="true">{tip.icon}</span>
            <span>{tip.text}</span>
          </li>
        {/each}
      </ul>
      <button bind:this={dismissButton} type="button" class="coachmark-button" onclick={dismiss}>
        Got it
      </button>
    </div>
  </div>
{/if}

<style>
  .coachmark-root {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .coachmark-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, var(--color-bg-canvas) 70%, transparent);
    backdrop-filter: blur(2px);
    cursor: pointer;
  }

  .coachmark-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 340px;
    padding: 1.25rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-edge);
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  }

  .coachmark-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .coachmark-tips {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .coachmark-tips li {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--color-text-secondary);
  }

  .coachmark-icon {
    flex-shrink: 0;
    font-size: 1rem;
    line-height: 1.4;
  }

  .coachmark-button {
    align-self: flex-end;
    padding: 0.5rem 1.25rem;
    background: var(--color-accent-primary);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms ease;
  }

  .coachmark-button:hover {
    opacity: 0.85;
  }
</style>
