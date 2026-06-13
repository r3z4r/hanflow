<script lang="ts">
	import type { ParsedSentence } from '$lib/schemas/sentence';
	import TopologyCanvas from '$lib/components/canvas/TopologyCanvas.svelte';
	import SpeakButton from '$lib/components/ui/SpeakButton.svelte';

	let { data }: { data: { parsedSentence: ParsedSentence } } = $props();
</script>

<svelte:head>
	<title>{data.parsedSentence.originalText} — HanFlow</title>
</svelte:head>

<div class="canvas-page">
	<div class="canvas-header">
		<a href="/" class="back-link">← New sentence</a>
		<h1 class="sentence-heading">{data.parsedSentence.originalText}</h1>
		<div class="sentence-speak">
			<SpeakButton
				text={data.parsedSentence.originalText}
				label="Play pronunciation of the full sentence"
			/>
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

	.sentence-heading {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sentence-speak {
		flex-shrink: 0;
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
