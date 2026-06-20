<script lang="ts">
	import '../app.css';
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import LoadingOverlay from '$lib/components/ui/LoadingOverlay.svelte';

	let { children, data } = $props();
</script>

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
