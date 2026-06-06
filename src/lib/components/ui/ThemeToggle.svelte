<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
</script>

<button
	onclick={() => theme.toggle()}
	aria-label={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
	title={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
	class="theme-toggle"
>
	{#if theme.current === 'dark'}
		<!-- Sun icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
			/>
		</svg>
	{:else}
		<!-- Moon icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{/if}
</button>

<style>
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: 1px solid var(--color-node-border);
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
	}

	.theme-toggle:hover {
		background: var(--color-bg-surface);
		color: var(--color-text-primary);
	}
</style>
