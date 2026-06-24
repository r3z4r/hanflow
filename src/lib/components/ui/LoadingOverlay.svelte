<script lang="ts">
	import { navigating } from '$app/state';
	import { parsing } from '$lib/utils/parsing.svelte';

	// Cover both the LLM parse (form action) and the redirect navigation to /canvas.
	let show = $derived(navigating.to !== null || parsing.active);
	let caption = $derived(parsing.active ? 'Analysing your sentence…' : '');
</script>

{#if show}
	<div class="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
		<div class="skeleton-stage">
			<div class="skeleton-block skeleton-block--lg"></div>
			<div class="skeleton-block skeleton-block--sm"></div>
			<div class="skeleton-block skeleton-block--md"></div>
			<div class="skeleton-block skeleton-block--sm"></div>
		</div>
		{#if caption}
			<p class="loading-caption">{caption}</p>
		{/if}
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		top: var(--navbar-height);
		left: 0;
		right: 0;
		bottom: 0;
		/* above NavBar (z-index: 100) so the overlay covers the page content */
		z-index: 200;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		background: var(--color-bg-canvas);
	}

	.loading-caption {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
	}

	.skeleton-stage {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		flex-wrap: wrap;
		max-width: 90vw;
	}

	/* Block dimensions are arbitrary decorative proportions, not design tokens */
	.skeleton-block {
		border-radius: var(--radius-node);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-edge);
		animation: pulse 1.4s ease-in-out infinite;
	}

	.skeleton-block--lg {
		width: 220px;
		height: 120px;
	}

	.skeleton-block--md {
		width: 160px;
		height: 90px;
		animation-delay: 0.2s;
	}

	.skeleton-block--sm {
		width: 110px;
		height: 60px;
		animation-delay: 0.4s;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-block {
			animation: none;
			opacity: 0.65;
		}
	}
</style>
