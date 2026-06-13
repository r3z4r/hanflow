<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<NavBar session={data.session} />
<LoadingOverlay />

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: calc(100dvh - var(--navbar-height));
	}
</style>
