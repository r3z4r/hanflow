<script lang="ts">
	let { sentenceText }: { sentenceText: string } = $props();

	type Status = 'idle' | 'submitting' | 'done' | 'error';

	let open = $state(false);
	let reason = $state('');
	let status = $state<Status>('idle');
	let firstField = $state<HTMLTextAreaElement | null>(null);

	function openModal() {
		reason = '';
		status = 'idle';
		open = true;
	}

	function close() {
		open = false;
	}

	$effect(() => {
		if (open && status === 'idle') firstField?.focus();
	});

	async function submit() {
		status = 'submitting';
		try {
			const res = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ sentenceText, reason: reason.trim() || undefined })
			});
			status = res.ok ? 'done' : 'error';
		} catch {
			status = 'error';
		}
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

<button
	type="button"
	class="report-trigger"
	aria-label="Report incorrect analysis"
	title="Report incorrect analysis"
	onclick={openModal}
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
		<line x1="4" y1="22" x2="4" y2="15" />
	</svg>
</button>

{#if open}
	<div class="modal-root">
		<button type="button" class="modal-backdrop" aria-label="Close" onclick={close}></button>
		<div class="modal-card" role="dialog" aria-modal="true" aria-label="Report incorrect analysis">
			{#if status === 'done'}
				<h2 class="modal-title">Thanks! 🙏</h2>
				<p class="modal-text">Your feedback helps improve the analysis.</p>
				<div class="modal-actions">
					<button type="button" class="btn-primary" onclick={close}>Close</button>
				</div>
			{:else}
				<h2 class="modal-title">Report incorrect analysis</h2>
				<p class="modal-text">Something off about “{sentenceText}”? Tell us what (optional).</p>
				<textarea
					bind:this={firstField}
					bind:value={reason}
					class="modal-textarea"
					rows="3"
					placeholder="e.g. 갑니다 isn't a noun…"
					maxlength="1000"
				></textarea>
				{#if status === 'error'}
					<p class="modal-error" role="alert">Couldn't send that. Please try again.</p>
				{/if}
				<div class="modal-actions">
					<button type="button" class="btn-ghost" onclick={close}>Cancel</button>
					<button
						type="button"
						class="btn-primary"
						disabled={status === 'submitting'}
						onclick={submit}
					>
						{status === 'submitting' ? 'Sending…' : 'Submit'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.report-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		background: none;
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease;
	}

	.report-trigger:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent-primary);
	}

	.report-trigger:active {
		transform: scale(0.96);
	}

	.report-trigger svg {
		width: 1rem;
		height: 1rem;
	}

	.modal-root {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal-backdrop {
		position: absolute;
		inset: 0;
		border: none;
		padding: 0;
		background: rgba(0, 0, 0, 0.5);
		cursor: pointer;
	}

	.modal-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 380px;
		padding: 1.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-edge);
		border-radius: 12px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
	}

	.modal-title {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.modal-text {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.modal-textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: var(--color-bg-canvas);
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: 0.875rem;
		resize: vertical;
		outline: none;
	}

	.modal-textarea:focus {
		border-color: var(--color-accent-primary);
	}

	.modal-error {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-accent-danger);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.btn-ghost,
	.btn-primary {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 150ms ease, color 150ms ease;
	}

	.btn-ghost {
		background: none;
		border: 1px solid var(--color-edge);
		color: var(--color-text-secondary);
	}

	.btn-ghost:hover {
		color: var(--color-text-primary);
	}

	.btn-primary {
		background: var(--color-accent-primary);
		border: none;
		color: #fff;
	}

	.btn-primary:hover {
		opacity: 0.85;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary:active:not(:disabled),
	.btn-ghost:active {
		transform: scale(0.97);
	}
</style>
