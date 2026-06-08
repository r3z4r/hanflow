<svelte:head>
	<title>Sign in — HanFlow</title>
</svelte:head>

<div class="login-page">
	<div class="login-card">
		<div class="card-header">
			<a href="/" class="brand">
				<span class="brand-ko">한</span>
				<span class="brand-text">Flow</span>
			</a>
			<h1 class="card-title">Sign in to HanFlow</h1>
		</div>

		<!-- OAuth providers -->
		<div class="oauth-section">
			<form method="POST" action="/auth/signin">
				<input type="hidden" name="provider" value="github" />
				<button type="submit" class="oauth-btn oauth-github">
					<svg class="provider-icon" viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="currentColor"
							d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
						/>
					</svg>
					Continue with GitHub
				</button>
			</form>

			<form method="POST" action="/auth/signin">
				<input type="hidden" name="provider" value="google" />
				<button type="submit" class="oauth-btn oauth-google">
					<svg class="provider-icon" viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					Continue with Google
				</button>
			</form>
		</div>

		<div class="divider">
			<span class="divider-label">or</span>
		</div>

		<!-- Credentials form -->
		<form method="POST" action="/auth/signin" class="credentials-form">
			<div class="field">
				<label for="email" class="field-label">Email</label>
				<input
					id="email"
					type="email"
					name="email"
					class="field-input"
					placeholder="you@example.com"
					autocomplete="email"
				/>
			</div>
			<div class="field">
				<label for="password" class="field-label">Password</label>
				<input
					id="password"
					type="password"
					name="password"
					class="field-input"
					placeholder="••••••••"
					autocomplete="current-password"
				/>
			</div>
			<button type="submit" class="credentials-btn">Sign in with Email</button>
		</form>
	</div>
</div>

<style>
	.login-page {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: calc(100dvh - var(--navbar-height));
		padding: calc(var(--navbar-height) + 2rem) 1rem 2rem;
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border, var(--color-edge));
		border-radius: 12px;
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.card-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}

	.brand {
		display: flex;
		align-items: baseline;
		gap: 2px;
		text-decoration: none;
		font-weight: 700;
		font-size: 1.5rem;
		line-height: 1;
	}

	.brand-ko {
		color: var(--color-node-particle);
		font-size: 1.75rem;
	}

	.brand-text {
		color: var(--color-text-primary);
	}

	.card-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.oauth-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.oauth-section form {
		margin: 0;
	}

	.oauth-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		padding: 0.625rem 1rem;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background 150ms ease,
			opacity 150ms ease;
		border: 1px solid var(--color-edge);
	}

	.oauth-github {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.oauth-github:hover {
		background: color-mix(in srgb, var(--color-bg-elevated) 80%, var(--color-text-primary) 10%);
	}

	.oauth-google {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.oauth-google:hover {
		background: color-mix(in srgb, var(--color-bg-elevated) 80%, var(--color-text-primary) 10%);
	}

	.provider-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.divider {
		position: relative;
		display: flex;
		align-items: center;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-edge);
	}

	.divider-label {
		padding: 0 0.75rem;
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.credentials-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.field-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg-input);
		border: 1px solid var(--color-edge);
		border-radius: 6px;
		color: var(--color-text-primary);
		font-size: 0.9375rem;
		transition: border-color 150ms ease;
		outline: none;
	}

	.field-input::placeholder {
		color: var(--color-text-muted);
	}

	.field-input:focus {
		border-color: var(--color-accent-primary);
	}

	.credentials-btn {
		width: 100%;
		padding: 0.625rem 1rem;
		background: var(--color-accent-primary);
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 150ms ease;
	}

	.credentials-btn:hover {
		opacity: 0.85;
	}

	@media (max-width: 480px) {
		.login-page {
			padding-top: calc(var(--navbar-height) + 1rem);
		}

		.login-card {
			border-radius: 0;
			border-left: none;
			border-right: none;
			padding: 1.5rem 1rem;
		}
	}
</style>
