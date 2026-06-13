<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		item: {
			id: string;
			sentenceHash: string;
			sentenceText: string;
			isFavorited: boolean;
			createdAt: Date;
		};
	}

	let { item }: Props = $props();

	// untrack() signals to Svelte that capturing the initial prop value is intentional —
	// the optimistic toggle below intentionally diverges local state from the prop.
	let isFavorited = $state(untrack(() => item.isFavorited));
	let isToggling = $state(false);

	const formattedDate = $derived(
		new Date(item.createdAt).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	);

	async function toggleFavorite() {
		if (isToggling) return;

		const previous = isFavorited;
		isFavorited = !previous;
		isToggling = true;

		try {
			const res = await fetch('/api/favorite', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: item.id })
			});

			if (!res.ok) {
				isFavorited = previous;
			} else {
				const data = await res.json();
				isFavorited = data.isFavorited;
			}
		} catch {
			isFavorited = previous;
		} finally {
			isToggling = false;
		}
	}
</script>

<div class="history-card">
	<a href="/canvas?hash={item.sentenceHash}" class="card-link">
		<p class="sentence-text">{item.sentenceText}</p>
		<time class="card-date" datetime={new Date(item.createdAt).toISOString()}>{formattedDate}</time>
	</a>
	<button
		type="button"
		class="favorite-btn"
		class:is-favorited={isFavorited}
		disabled={isToggling}
		onclick={toggleFavorite}
		aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
		aria-pressed={isFavorited}
		title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
	>
		{#if isFavorited}
			<!-- Filled star -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					d="M12 2.5l2.95 6.27 6.55.95-4.75 4.63 1.12 6.65L12 17.77l-5.87 3.23 1.12-6.65L2.5 9.72l6.55-.95L12 2.5z"
				/>
			</svg>
		{:else}
			<!-- Outline star -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path
					d="M12 2.5l2.95 6.27 6.55.95-4.75 4.63 1.12 6.65L12 17.77l-5.87 3.23 1.12-6.65L2.5 9.72l6.55-.95L12 2.5z"
				/>
			</svg>
		{/if}
	</button>
</div>

<style>
	.history-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		transition: border-color 150ms ease;
	}

	.history-card:hover {
		border-color: var(--color-accent-primary);
	}

	.card-link {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		color: inherit;
		text-decoration: none;
		padding-right: 2rem;
	}

	.card-link:hover {
		text-decoration: none;
	}

	.sentence-text {
		color: var(--color-text-primary);
		font-size: 1.0625rem;
		line-height: 1.5;
		word-break: break-word;
	}

	.card-date {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.favorite-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: opacity 150ms ease, color 150ms ease;
	}

	.favorite-btn:hover:not(:disabled) {
		color: var(--color-accent-primary);
	}

	.favorite-btn.is-favorited {
		color: var(--color-accent-primary);
	}

	.favorite-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
