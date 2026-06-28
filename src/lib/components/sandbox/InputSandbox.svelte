<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { recents } from '$lib/utils/recents.svelte';
  import { parsing } from '$lib/utils/parsing.svelte';

  interface Props {
    actionData?: { error?: string } | null;
  }
  let { actionData = null }: Props = $props();

  // Beginner sentences offered to first-time visitors who have nothing to paste.
  const EXAMPLES = [
    '저는 학교에 갑니다',
    '고양이가 물을 마셔요',
    '오늘 날씨가 좋아요',
    '저는 한국어를 공부해요',
  ];

  let value = $state('');
  let submitting = $state(false);
  let formEl: HTMLFormElement;
  // Recents come from localStorage; gate their render until mount to avoid an
  // SSR/client hydration mismatch.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  // Accept anything containing some Hangul; sanitization happens server-side.
  const HANGUL_RE = /[가-힣ㄱ-ㆎ]/u;
  function hint(text: string) {
    const t = text.trim();
    if (!t) return '';
    return HANGUL_RE.test(t) ? '' : 'Enter some Korean (한글) to analyze';
  }
  let clientHint = $derived(hint(value));

  const MODES = [
    { id: 'full', label: 'Full' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'pronounce', label: 'Pronounce' },
    { id: 'translate', label: 'Translate' }
  ];
  let mode = $state('full');

  // Fill the input with a suggested sentence and analyse it in one tap.
  // Await tick() so the bound value reaches the textarea's DOM before submit —
  // otherwise the form serializes an empty field and the server rejects it.
  async function runSuggestion(sentence: string) {
    value = sentence;
    await tick();
    formEl.requestSubmit();
  }
</script>

<section class="sandbox">
  <form
    method="POST"
    bind:this={formEl}
    use:enhance={() => {
      const submitted = value;
      submitting = true;
      parsing.start();
      return async ({ result, update }) => {
        submitting = false;
        if (result.type === 'redirect') recents.add(submitted);
        await update();
        parsing.stop();
      };
    }}
  >
    <div class="input-area">
      <textarea
        name="sentence"
        bind:value
        placeholder="한국어 문장을 입력하세요… (예: 저는 학교에 갑니다)"
        rows="3"
        class="sentence-input"
        class:has-error={!!clientHint}
        aria-label="Korean sentence input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      ></textarea>

      {#if clientHint}
        <p class="error-msg" role="alert">{clientHint}</p>
      {:else if actionData?.error}
        <p class="error-msg" role="alert">{actionData.error}</p>
      {/if}
    </div>

    <input type="hidden" name="mode" value={mode} />

    <div class="mode-chips" role="group" aria-label="Analysis mode">
      {#each MODES as m (m.id)}
        <button
          type="button"
          class="mode-chip"
          class:selected={mode === m.id}
          aria-pressed={mode === m.id}
          onclick={() => (mode = m.id)}
        >
          {m.label}
        </button>
      {/each}
    </div>

    <button
      type="submit"
      class="submit-btn"
      disabled={submitting || !value.trim()}
    >
      {submitting ? 'Analysing…' : actionData?.error ? 'Try again' : 'Analyse'}
    </button>

    {#if !value.trim()}
      <div class="suggestions">
        {#if mounted && recents.items.length}
          <div class="suggestion-group">
            <span class="suggestion-label">Recent</span>
            <div class="chips">
              {#each recents.items as sentence (sentence)}
                <button type="button" class="chip" onclick={() => runSuggestion(sentence)}>
                  {sentence}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        <div class="suggestion-group">
          <span class="suggestion-label">Try an example</span>
          <div class="chips">
            {#each EXAMPLES as sentence (sentence)}
              <button type="button" class="chip" onclick={() => runSuggestion(sentence)}>
                {sentence}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </form>
</section>

<style>
  .sandbox {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .input-area {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sentence-input {
    width: 100%;
    padding: 0.875rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-edge);
    border-radius: 10px;
    color: var(--color-text-primary);
    font-size: 1.125rem;
    line-height: 1.6;
    resize: vertical;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    outline: none;
    font-family: inherit;
  }

  .sentence-input::placeholder {
    color: var(--color-text-muted);
  }

  .sentence-input:focus {
    border-color: var(--color-accent-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-primary) 20%, transparent);
  }

  .sentence-input.has-error {
    border-color: var(--color-accent-danger);
  }

  .error-msg {
    font-size: 0.8125rem;
    color: var(--color-accent-danger);
  }

  .submit-btn {
    align-self: flex-end;
    padding: 0.625rem 1.75rem;
    background: var(--color-accent-primary);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms ease;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .submit-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .submit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }

  .suggestion-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .suggestion-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    padding: 0.375rem 0.75rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-edge);
    border-radius: 100px;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease;
  }

  .chip:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
  }

  .chip:active {
    transform: scale(0.96);
  }

  .mode-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .mode-chip {
    padding: 0.375rem 0.75rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-edge);
    border-radius: 100px;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease;
  }

  .mode-chip:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-text-primary);
    background: var(--color-bg-elevated);
  }

  .mode-chip.selected {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: #fff;
  }

  .mode-chip:active {
    transform: scale(0.96);
  }

  @media (min-width: 768px) {
    .sandbox {
      padding: 0;
    }

    .sentence-input {
      font-size: 1.25rem;
    }
  }
</style>
