<script lang="ts">
	import { display } from '$lib/utils/display.svelte';
	import { speech } from '$lib/utils/speech.svelte';

	let open = $state(false);
	let rootEl = $state<HTMLDivElement | null>(null);

	function close() {
		open = false;
	}

	// Close when clicking outside the control.
	function onWindowClick(event: MouseEvent) {
		if (open && rootEl && !rootEl.contains(event.target as Node)) close();
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={(e) => open && e.key === 'Escape' && close()} />

<div class="display-options" bind:this={rootEl}>
	<button
		type="button"
		class="trigger"
		class:active={open}
		aria-haspopup="true"
		aria-expanded={open}
		aria-label="Display options"
		title="Display options"
		onclick={() => (open = !open)}
	>
		Aa
	</button>

	{#if open}
		<div class="popover">
			<label class="option">
				<input
					type="checkbox"
					checked={display.romanizationVisible}
					onchange={() => display.toggleRomanization()}
				/>
				Romanization
			</label>
			<label class="option">
				<input
					type="checkbox"
					checked={display.glossVisible}
					onchange={() => display.toggleGloss()}
				/>
				English gloss
			</label>

			{#if speech.isSupported}
				<div class="option speed">
					<span>Speed</span>
					<div class="speed-buttons">
						<button
							type="button"
							class:active={speech.rate === speech.NORMAL_RATE}
							onclick={() => speech.setRate(speech.NORMAL_RATE)}
						>
							Normal
						</button>
						<button
							type="button"
							class:active={speech.rate === speech.SLOW_RATE}
							onclick={() => speech.setRate(speech.SLOW_RATE)}
						>
							Slow
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.display-options {
		position: relative;
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		background: none;
		border: 1px solid var(--color-edge);
		border-radius: 8px;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease;
	}

	.trigger:hover,
	.trigger.active {
		color: var(--color-text-primary);
		border-color: var(--color-accent-primary);
	}

	.popover {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		min-width: 200px;
		padding: 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-edge);
		border-radius: 10px;
		box-shadow: var(--shadow-node);
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.option input {
		accent-color: var(--color-accent-primary);
		cursor: pointer;
	}

	.speed {
		justify-content: space-between;
		cursor: default;
	}

	.speed-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.speed-buttons button {
		padding: 0.25rem 0.625rem;
		background: var(--color-bg-canvas);
		border: 1px solid var(--color-edge);
		border-radius: 6px;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
	}

	.speed-buttons button.active {
		background: var(--color-accent-primary);
		border-color: var(--color-accent-primary);
		color: #fff;
	}
</style>
