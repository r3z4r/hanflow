<script lang="ts">
	import { untrack } from 'svelte';

	let { historyId, isFavorited: initial }: { historyId: string; isFavorited: boolean } = $props();

	// Seed local optimistic state from the server value once (the page remounts on
	// navigation, so the prop never changes during this component's life).
	let isFavorited = $state(untrack(() => initial));
	let pending = $state(false);

	async function toggle() {
		if (pending) return;
		const previous = isFavorited;
		isFavorited = !isFavorited; // optimistic
		pending = true;
		try {
			const res = await fetch('/api/favorite', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: historyId })
			});
			if (!res.ok) throw new Error('Request failed');
			isFavorited = (await res.json()).isFavorited;
		} catch {
			isFavorited = previous; // revert on failure
		} finally {
			pending = false;
		}
	}
</script>

<button
	type="button"
	class="favorite-button"
	class:active={isFavorited}
	aria-pressed={isFavorited}
	aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
	title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
	onclick={toggle}
>
	<svg
		viewBox="0 0 24 24"
		fill={isFavorited ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
	>
		<polygon
			points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
		/>
	</svg>
</button>

<style>
	.favorite-button {
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

	.favorite-button:hover {
		color: var(--color-text-primary);
		border-color: var(--color-accent-primary);
	}

	.favorite-button.active {
		color: var(--color-accent-primary);
		border-color: var(--color-accent-primary);
	}

	.favorite-button svg {
		width: 1rem;
		height: 1rem;
	}
</style>
