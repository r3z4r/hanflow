<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<NavBar />

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: calc(100dvh - var(--navbar-height));
	}
</style>
