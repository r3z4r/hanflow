<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>History — HanFlow</title>
</svelte:head>

<div class="history-page">
	<h1>Your History</h1>
	<p class="empty-state">Your analyzed sentences will appear here.</p>
</div>

<style>
	.history-page {
		max-width: 800px;
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
</style>
