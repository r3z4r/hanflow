<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    actionData?: { error?: string } | null;
  }
  let { actionData = null }: Props = $props();

  let value = $state('');
  let submitting = $state(false);
  let clientError = $state('');

  // Korean Unicode: syllables (가-힣) + jamo (ㄱ-ㆎ) + space + punctuation
  const HANGUL_RE = /^[가-힣ㄱ-ㆎ \p{P}]+$/u;

  function validate(text: string) {
    const t = text.trim();
    if (!t) return '';
    return HANGUL_RE.test(t) ? '' : 'Please enter Korean text only (한글)';
  }

  $effect(() => {
    clientError = validate(value);
  });
</script>

<section class="sandbox">
  <form
    method="POST"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        submitting = false;
        await update();
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
        class:has-error={!!clientError}
        aria-label="Korean sentence input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      ></textarea>

      {#if clientError}
        <p class="error-msg" role="alert">{clientError}</p>
      {:else if actionData?.error}
        <p class="error-msg" role="alert">{actionData.error}</p>
      {/if}
    </div>

    <button
      type="submit"
      class="submit-btn"
      disabled={submitting || !!clientError || !value.trim()}
    >
      {submitting ? 'Analysing…' : actionData?.error ? 'Try again' : 'Analyse'}
    </button>
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

  .submit-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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
