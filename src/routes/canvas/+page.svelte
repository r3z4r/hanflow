<script lang="ts">
	import type { ParsedSentence } from '$lib/schemas/sentence';
	import TopologyCanvas from '$lib/components/canvas/TopologyCanvas.svelte';
	import SpeakButton from '$lib/components/ui/SpeakButton.svelte';
	import DisplayOptions from '$lib/components/ui/DisplayOptions.svelte';
	import ReportModal from '$lib/components/ui/ReportModal.svelte';

	let { data }: { data: { parsedSentence: ParsedSentence } } = $props();
</script>

<svelte:head>
	<title>{data.parsedSentence.originalText} — HanFlow</title>
</svelte:head>

<div class="canvas-page">
	<div class="canvas-header">
		<a href="/" class="back-link">← New sentence</a>
		<span class="header-divider" aria-hidden="true"></span>
		<div class="sentence-block">
			<h1 class="sentence-heading">{data.parsedSentence.originalText}</h1>
			{#if data.parsedSentence.translation}
				<p class="sentence-translation">{data.parsedSentence.translation}</p>
			{/if}
		</div>
		<div class="sentence-actions">
			<SpeakButton
				text={data.parsedSentence.originalText}
				label="Play pronunciation of the full sentence"
			/>
			<DisplayOptions />
			<ReportModal sentenceText={data.parsedSentence.originalText} />
		</div>
	</div>
	<div class="canvas-area">
		<TopologyCanvas parsedSentence={data.parsedSentence} />
	</div>
</div>

<style>
	.canvas-page {
		display: flex;
		flex-direction: column;
		height: calc(100dvh - var(--navbar-height));
	}

	.canvas-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-edge);
		flex-shrink: 0;
	}

	.back-link {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		white-space: nowrap;
		transition: color 150ms ease;
	}

	.back-link:hover {
		color: var(--color-text-primary);
	}

	.header-divider {
		align-self: stretch;
		width: 1px;
		background: var(--color-edge);
		flex-shrink: 0;
	}

	.sentence-block {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.sentence-heading {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sentence-translation {
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--color-text-secondary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sentence-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.canvas-area {
		flex: 1;
		--node-min-width: 80px;
	}

	@media (min-width: 768px) {
		.canvas-area {
			--node-min-width: 120px;
		}
	}
</style>
