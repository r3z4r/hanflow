<script lang="ts">
	let { hash }: { hash: string } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function share() {
		const url = `${window.location.origin}/canvas?hash=${hash}`;
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			// Clipboard API unavailable (insecure context / permissions) — fall back.
			window.prompt('Copy this link:', url);
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<button
	type="button"
	class="share-button"
	class:copied
	aria-label={copied ? 'Link copied' : 'Copy share link'}
	title={copied ? 'Link copied' : 'Copy share link'}
	onclick={share}
>
	{#if copied}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	{/if}
</button>

<style>
	.share-button {
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

	.share-button:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent-primary);
	}

	.share-button:active {
		transform: scale(0.96);
	}

	.share-button.copied {
		color: var(--color-node-verb);
		border-color: var(--color-node-verb);
	}

	.share-button svg {
		width: 1rem;
		height: 1rem;
	}
</style>
