<script lang="ts">
	import type { ParsedSentence } from '$lib/schemas/sentence';

	let { data }: { data: { parsedSentence: ParsedSentence } } = $props();

</script>

<svelte:head>
	<title>Canvas — HanFlow</title>
</svelte:head>

<div class="canvas-page">
	<div class="canvas-header">
		<a href="/" class="back-link">← New sentence</a>
		<h1 class="sentence-text">{data.parsedSentence.originalText}</h1>
	</div>

	<div class="json-preview">
		<p class="json-label">Parsed result (Phase 4 will render this as a visual canvas)</p>
		<pre class="json-block">{JSON.stringify(data.parsedSentence, null, 2)}</pre>
	</div>
</div>

<style>
	.canvas-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem 1rem 4rem;
	}

	.canvas-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.back-link {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		transition: color 150ms ease;
		width: fit-content;
	}

	.back-link:hover {
		color: var(--color-text-primary);
	}

	.sentence-text {
		font-size: clamp(1.25rem, 3vw, 2rem);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.json-preview {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.json-label {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.json-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		padding: 1.25rem;
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		overflow-x: auto;
		white-space: pre;
		tab-size: 2;
	}

	@media (min-width: 768px) {
		.canvas-page {
			padding: 2rem 1.5rem 4rem;
		}
	}
</style>
