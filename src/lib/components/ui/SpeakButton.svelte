<script lang="ts">
	import { speech } from '$lib/utils/speech.svelte';

	let { text, label }: { text: string; label: string } = $props();

	let isSpeaking = $derived(speech.speakingId === text);

	function handleClick(event: MouseEvent) {
		event.stopPropagation();

		if (isSpeaking) {
			speech.stop();
		} else {
			speech.speak(text, text);
		}
	}
</script>

{#if speech.isSupported}
	<button
		type="button"
		class="speak-button"
		class:speaking={isSpeaking}
		aria-label={isSpeaking ? 'Stop pronunciation' : label}
		onclick={handleClick}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M11 5 6 9H2v6h4l5 4V5z" />
			<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
			<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
		</svg>
	</button>
{/if}

<style>
	.speak-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		background: none;
		border: none;
		border-radius: 999px;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background-color 150ms ease, color 150ms ease;
	}

	.speak-button svg {
		width: 1rem;
		height: 1rem;
	}

	.speak-button:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.speak-button.speaking {
		color: var(--color-accent-primary);
	}
</style>
