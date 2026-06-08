<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';

	interface SessionUser {
		name?: string | null;
		email?: string | null;
		image?: string | null;
	}

	interface NavSession {
		user?: SessionUser;
		expires: string;
	}

	let { session = null }: { session: NavSession | null } = $props();

	function getInitials(name: string | null | undefined): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}
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
		<div class="navbar-end">
			<ThemeToggle />
			{#if session?.user}
				<div class="user-area">
					{#if session.user.image}
						<img
							src={session.user.image}
							alt={session.user.name ?? 'User avatar'}
							class="avatar"
						/>
					{:else}
						<div class="avatar avatar-initials" aria-hidden="true">
							{getInitials(session.user.name)}
						</div>
					{/if}
					<form method="POST" action="/auth/signout" class="signout-form">
						<button type="submit" class="signout-btn">Sign out</button>
					</form>
				</div>
			{:else}
				<a href="/login" class="signin-link">Sign in</a>
			{/if}
		</div>
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

	.navbar-end {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-area {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--color-edge);
		flex-shrink: 0;
	}

	.avatar-initials {
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		font-size: 0.625rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.signout-form {
		margin: 0;
		padding: 0;
	}

	.signout-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		padding: 0;
		transition: color 150ms ease;
	}

	.signout-btn:hover {
		color: var(--color-text-primary);
	}

	.signin-link {
		color: var(--color-accent-primary);
		font-size: 0.875rem;
		text-decoration: none;
		transition: opacity 150ms ease;
	}

	.signin-link:hover {
		opacity: 0.8;
		text-decoration: none;
	}

	@media (max-width: 480px) {
		.nav-links {
			display: none;
		}
	}
</style>
