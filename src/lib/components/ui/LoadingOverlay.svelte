<script lang="ts">
	import { navigating } from '$app/state';

	let isNavigating = $derived(navigating.to !== null);
</script>

{#if isNavigating}
	<div class="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
		<div class="skeleton-stage">
			<div class="skeleton-block skeleton-block--lg"></div>
			<div class="skeleton-block skeleton-block--sm"></div>
			<div class="skeleton-block skeleton-block--md"></div>
			<div class="skeleton-block skeleton-block--sm"></div>
		</div>
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		top: var(--navbar-height);
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		background: var(--color-bg-canvas);
	}

	.skeleton-stage {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		flex-wrap: wrap;
		max-width: 90vw;
	}

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
