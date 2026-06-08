<script lang="ts">
  import InputSandbox from '$lib/components/sandbox/InputSandbox.svelte';

  let { form } = $props();
</script>

<svelte:head>
  <title>HanFlow — Korean Sentence Analyser</title>
</svelte:head>

<div class="home">
  <div class="hero">
    <span class="badge">Beta</span>
    <h1 class="headline">
      Understand Korean<br />
      <span class="headline-accent">sentence by sentence</span>
    </h1>
    <p class="subtitle">
      Paste any Korean sentence and get an interactive visual breakdown
      of grammar, particles, and conjugation.
    </p>
  </div>

  <InputSandbox actionData={form} />
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    padding: 3rem 1rem 4rem;
    min-height: calc(100dvh - var(--navbar-height));
  }

  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    max-width: 560px;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background: color-mix(in srgb, var(--color-node-particle) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-node-particle) 30%, transparent);
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-node-particle);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .headline {
    font-size: clamp(1.875rem, 5vw, 3rem);
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
    margin: 0;
  }

  .headline-accent {
    color: var(--color-node-particle);
  }

  .subtitle {
    font-size: 1rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  @media (min-width: 768px) {
    .home {
      padding-top: 5rem;
      gap: 3rem;
    }
  }
</style>
