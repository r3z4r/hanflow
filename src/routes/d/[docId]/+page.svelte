<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy, untrack } from 'svelte';
	import SegmentCard from '$lib/components/results/SegmentCard.svelte';
	import { createResultsState } from '$lib/components/results/results.state.svelte';
	import { ModeSchema, type Mode } from '$lib/schemas/analysis';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const MODES: { id: Mode; label: string }[] = [
		{ id: 'full', label: 'Full' },
		{ id: 'breakdown', label: 'Breakdown' },
		{ id: 'pronounce', label: 'Pronounce' },
		{ id: 'translate', label: 'Translate' }
	];

	// The mode shown initially: the URL's ?mode= if valid, else the document's saved
	// default, else Full. The document id/defaultMode are fixed for the page's lifetime.
	const urlMode = ModeSchema.safeParse(page.url.searchParams.get('mode'));
	const docDefaultMode = ModeSchema.safeParse(untrack(() => data.document.defaultMode));
	const initialMode: Mode = urlMode.success
		? urlMode.data
		: docDefaultMode.success
			? docDefaultMode.data
			: 'full';
	let mode = $state<Mode>(initialMode);

	const results = createResultsState(untrack(() => data.document.id), initialMode);
	$effect(() => {
		results.requestMode(mode);
	});
	onDestroy(() => results.close());
</script>

<svelte:head><title>{data.document.rawInput} — HanFlow</title></svelte:head>

<div class="results-page">
	<header class="results-header">
		<a href="/" class="back-link">← New analysis</a>
		<p class="doc-input">{data.document.rawInput}</p>
		<div class="mode-chips" role="group" aria-label="Analysis mode">
			{#each MODES as m (m.id)}
				<button
					type="button"
					class="mode-chip"
					class:selected={mode === m.id}
					aria-pressed={mode === m.id}
					onclick={() => (mode = m.id)}
				>
					{m.label}
				</button>
			{/each}
		</div>
	</header>

	<div class="segment-list">
		{#each data.segments as seg (seg.ordinal)}
			<SegmentCard
				text={seg.segmentText}
				unitType={seg.unitType}
				{mode}
				aspects={results.get(seg.ordinal)}
			/>
		{/each}
	</div>
</div>

<style>
	.results-page {
		max-width: 880px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.results-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.back-link {
		color: var(--color-accent-primary);
		text-decoration: none;
		font-size: 0.875rem;
	}
	.doc-input {
		color: var(--color-text-primary);
		font-size: 1.25rem;
		margin: 0;
	}
	.mode-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.mode-chip {
		padding: 0.375rem 0.875rem;
		border: 1px solid var(--color-edge);
		border-radius: 100px;
		background: var(--color-bg-surface);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.mode-chip.selected {
		border-color: var(--color-accent-primary);
		color: #fff;
		background: var(--color-accent-primary);
	}
	.segment-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
