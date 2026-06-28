<script lang="ts">
	import TopologyCanvas from '$lib/components/canvas/TopologyCanvas.svelte';
	import SpeakButton from '$lib/components/ui/SpeakButton.svelte';
	import { composeParsedSentence } from '$lib/utils/canvas-adapter';
	import type { Mode } from '$lib/schemas/analysis';
	import type {
		StructureAspect,
		TranslationAspect,
		PronunciationAspect,
		GlossaryAspect
	} from '$lib/schemas/aspects';
	import type { SegmentAspects } from './results.state.svelte';

	let {
		text,
		unitType,
		mode,
		aspects
	}: { text: string; unitType: string; mode: Mode; aspects: SegmentAspects } = $props();

	let translation = $derived(aspects.translation as TranslationAspect | undefined);
	let structure = $derived(aspects.structure as StructureAspect | undefined);
	let pronunciation = $derived(aspects.pronunciation as PronunciationAspect | undefined);
	let glossary = $derived(aspects.glossary as GlossaryAspect | undefined);

	let showStructure = $derived(mode === 'breakdown' || mode === 'full');
	let showPronunciation = $derived(mode === 'pronounce' || mode === 'full');
	let showGlossary = $derived(mode === 'full');

	let parsed = $derived(
		structure ? composeParsedSentence({ text, structure, translation, glossary }) : null
	);
	let expanded = $state(false);
</script>

<article class="segment-card">
	<header class="segment-head">
		<span class="seg-text">{text}</span>
		<span class="unit-badge">{unitType}</span>
		<div class="segment-actions">
			<SpeakButton {text} label="Play pronunciation of this segment" />
		</div>
	</header>

	{#if translation}
		<p class="translation">{translation.translation}</p>
	{/if}

	{#if showPronunciation}
		{#if pronunciation}
			<div class="pronunciation">
				<p class="romaja">{pronunciation.fullRomanization}</p>
				{#each pronunciation.phoneticNotes as note (note.description)}
					<p class="phonetic-note">
						<strong>{note.phenomenon}:</strong> {note.description}
					</p>
				{/each}
			</div>
		{:else}
			<p class="loading">Loading pronunciation…</p>
		{/if}
	{/if}

	{#if showStructure}
		{#if parsed}
			<button type="button" class="expand-toggle" onclick={() => (expanded = !expanded)}>
				{expanded ? 'Hide' : 'Show'} breakdown
			</button>
			{#if expanded}
				<div class="canvas-wrap">
					<TopologyCanvas parsedSentence={parsed} />
				</div>
			{/if}
		{:else}
			<p class="loading">Loading breakdown…</p>
		{/if}
	{/if}

	{#if showGlossary}
		{#if glossary}
			<ul class="glossary">
				{#each glossary.entries as entry (entry.headword)}
					<li><strong>{entry.headword}</strong> — {entry.definition}</li>
				{/each}
			</ul>
		{:else}
			<p class="loading">Loading glossary…</p>
		{/if}
	{/if}
</article>

<style>
	.segment-card {
		border: 1px solid var(--color-edge);
		border-radius: var(--radius-node, 10px);
		background: var(--color-bg-surface);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.segment-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.seg-text {
		font-size: 1.125rem;
		color: var(--color-text-primary);
		flex: 1;
	}
	.unit-badge {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		border: 1px solid var(--color-edge);
		border-radius: 100px;
		padding: 0.125rem 0.5rem;
	}
	.segment-actions {
		display: flex;
		gap: 0.25rem;
	}
	.translation {
		color: var(--color-text-primary);
		margin: 0;
	}
	.romaja {
		color: var(--color-text-secondary);
		font-style: italic;
		margin: 0 0 0.25rem;
	}
	.phonetic-note {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0.125rem 0;
	}
	.expand-toggle {
		align-self: flex-start;
		background: none;
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		color: var(--color-accent-primary);
		padding: 0.375rem 0.75rem;
		cursor: pointer;
		font: inherit;
	}
	.canvas-wrap {
		height: 360px;
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		overflow: hidden;
	}
	.glossary {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--color-text-secondary);
		font-size: 0.9375rem;
	}
	.loading {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin: 0;
	}
</style>
