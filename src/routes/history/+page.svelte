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
		<p class="empty-state">Your analyzed sentences will appear here.</p>
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
		color: var(--color-text-muted);
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
