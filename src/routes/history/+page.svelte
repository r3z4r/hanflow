<script lang="ts">
	import HistoryCard from '$lib/components/history/HistoryCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>History — HanFlow</title>
</svelte:head>

<div class="history-page">
	<h1>Your History</h1>

	{#if data.items.length === 0}
		<div class="empty-state">
			<svg
				class="empty-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
				<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
			</svg>
			<h2 class="empty-title">No sentences yet</h2>
			<p class="empty-text">Sentences you analyze will be saved here for review.</p>
			<a href="/" class="empty-cta">Analyze a sentence</a>
		</div>
	{:else}
		<div class="history-grid">
			{#each data.items as item (item.id)}
				<HistoryCard {item} />
			{/each}
		</div>

		{#if data.totalPages > 1}
			<nav class="pagination" aria-label="History pagination">
				{#if data.page > 1}
					<a href="/history?page={data.page - 1}" class="page-link">Previous</a>
				{:else}
					<span class="page-link disabled">Previous</span>
				{/if}

				<span class="page-indicator">Page {data.page} of {data.totalPages}</span>

				{#if data.page < data.totalPages}
					<a href="/history?page={data.page + 1}" class="page-link">Next</a>
				{:else}
					<span class="page-link disabled">Next</span>
				{/if}
			</nav>
		{/if}
	{/if}
</div>

<style>
	.history-page {
		max-width: 1024px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	h1 {
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		padding: 4rem 1rem;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: var(--color-text-muted);
	}

	.empty-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.empty-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		max-width: 320px;
	}

	.empty-cta {
		margin-top: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--color-accent-primary);
		color: #fff;
		font-size: 0.9375rem;
		font-weight: 600;
		text-decoration: none;
		border-radius: 8px;
		transition: opacity 150ms ease;
	}

	.empty-cta:hover {
		opacity: 0.85;
	}

	.empty-cta:active {
		transform: scale(0.96);
	}

	.history-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.page-link {
		color: var(--color-accent-primary);
		font-size: 0.875rem;
		text-decoration: none;
		padding: 0.5rem 0.875rem;
		border-radius: 8px;
		border: 1px solid var(--color-edge);
		transition: border-color 150ms ease;
	}

	.page-link:hover {
		text-decoration: none;
		border-color: var(--color-accent-primary);
	}

	.page-link.disabled {
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.page-link.disabled:hover {
		border-color: var(--color-edge);
	}

	.page-indicator {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	@media (min-width: 768px) {
		.history-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
