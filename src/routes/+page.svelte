<script lang="ts">
	// Home page — input sandbox will be added in Phase 3
</script>

<svelte:head>
	<title>HanFlow — Korean Sentence Analyzer</title>
	<meta name="description" content="Deconstruct Korean sentences into interactive grammar nodes." />
</svelte:head>

<section class="hero">
	<div class="hero-inner">
		<div class="hero-badge">Korean Language Tool</div>
		<h1 class="hero-title">
			Understand Korean,<br />
			<span class="hero-accent">sentence by sentence</span>
		</h1>
		<p class="hero-subtitle">
			Paste any Korean sentence and watch it transform into an interactive visual map — color-coded
			grammar nodes, particle bridges, conjugation timelines, and pronunciation guides.
		</p>
		<div class="hero-demo">
			<span class="demo-sentence">저는 학교에 갑니다</span>
			<span class="demo-label">Try it in Phase 3 →</span>
		</div>
		<div class="hero-tokens">
			<span class="token token-noun">저는</span>
			<span class="token token-particle">에</span>
			<span class="token token-noun">학교</span>
			<span class="token token-verb">갑니다</span>
		</div>
	</div>
</section>

<style>
	.hero {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100dvh - var(--navbar-height));
		padding: 2rem 1rem;
	}

	.hero-inner {
		max-width: 640px;
		width: 100%;
		text-align: center;
	}

	.hero-badge {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent-primary);
		background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent-primary) 30%, transparent);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		margin-bottom: 1.5rem;
	}

	.hero-title {
		font-size: clamp(2rem, 6vw, 3.25rem);
		font-weight: 800;
		line-height: 1.15;
		color: var(--color-text-primary);
		margin-bottom: 1.25rem;
		letter-spacing: -0.02em;
	}

	.hero-accent {
		color: var(--color-node-particle);
	}

	.hero-subtitle {
		font-size: clamp(0.9rem, 2vw, 1.0625rem);
		color: var(--color-text-secondary);
		line-height: 1.7;
		margin-bottom: 2rem;
	}

	.hero-demo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.demo-sentence {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: 0.02em;
	}

	.demo-label {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.hero-tokens {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.token {
		padding: 0.375rem 0.875rem;
		border-radius: var(--radius-node);
		font-size: 0.9375rem;
		font-weight: 600;
		border: 1px solid;
	}

	.token-noun {
		background: color-mix(in srgb, var(--color-node-noun) 12%, transparent);
		color: var(--color-node-noun);
		border-color: color-mix(in srgb, var(--color-node-noun) 40%, transparent);
	}

	.token-particle {
		background: color-mix(in srgb, var(--color-node-particle) 12%, transparent);
		color: var(--color-node-particle);
		border-color: color-mix(in srgb, var(--color-node-particle) 40%, transparent);
	}

	.token-verb {
		background: color-mix(in srgb, var(--color-node-verb) 12%, transparent);
		color: var(--color-node-verb);
		border-color: color-mix(in srgb, var(--color-node-verb) 40%, transparent);
	}
</style>
