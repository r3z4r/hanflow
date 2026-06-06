<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<header class="navbar">
	<div class="navbar-inner">
		<a href="/" class="brand">
			<span class="brand-ko">한</span>
			<span class="brand-text">Flow</span>
		</a>
		<nav class="nav-links">
			<a href="/history" class="nav-link">History</a>
		</nav>
		<ThemeToggle />
	</div>
</header>

<style>
	.navbar {
		position: sticky;
		top: 0;
		z-index: 100;
		background: color-mix(in srgb, var(--color-bg-surface) 85%, transparent);
		border-bottom: 1px solid var(--color-edge);
		backdrop-filter: blur(8px);
	}

	.navbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		height: var(--navbar-height);
	}

	.brand {
		display: flex;
		align-items: baseline;
		gap: 2px;
		text-decoration: none;
		font-weight: 700;
		font-size: 1.125rem;
		line-height: 1;
	}

	.brand-ko {
		color: var(--color-node-particle);
		font-size: 1.25rem;
	}

	.brand-text {
		color: var(--color-text-primary);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-link {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		transition: color 150ms ease;
	}

	.nav-link:hover {
		color: var(--color-text-primary);
		text-decoration: none;
	}

	@media (max-width: 480px) {
		.nav-links {
			display: none;
		}
	}
</style>
