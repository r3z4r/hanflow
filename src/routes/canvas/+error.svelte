<script lang="ts">
	import { page } from '$app/state';

	let headline = $derived(
		page.status === 404 ? "This sentence couldn't be found" : "Couldn't load this sentence"
	);

	let subtitle = $derived(
		page.status === 404
			? 'The link may be broken, or the sentence is no longer available.'
			: (page.error?.message ?? 'This may be a temporary issue with the cache or database.')
	);
</script>

<svelte:head>
	<title>{page.status} — HanFlow</title>
</svelte:head>

<div class="error-page">
	<div class="content">
		<p class="status">{page.status}</p>
		<h1 class="headline">{headline}</h1>
		<p class="subtitle">{subtitle}</p>
		<a href="/" class="back-link">← Start a new analysis</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100dvh - var(--navbar-height));
		padding: 3rem 1rem 4rem;
		text-align: center;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: 560px;
	}

	.status {
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 700;
		line-height: 1;
		color: var(--color-accent-primary);
		margin: 0;
	}

	.headline {
		font-size: clamp(1.5rem, 4vw, 2.25rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-text-primary);
		margin: 0;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.back-link {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
		margin-top: 0.5rem;
		transition: color 150ms ease;
	}

	.back-link:hover {
		color: var(--color-text-primary);
	}
</style>
