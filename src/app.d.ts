import type { DefaultSession } from '@auth/core/types';

declare module '@auth/core/types' {
	interface Session {
		user: {
			id: string;
		} & DefaultSession['user'];
	}
}

// App.Locals (auth, signIn, signOut) and App.PageData (session) are provided
// globally by @auth/sveltekit/dist/types.d.ts — no redeclaration needed.

declare global {
	namespace App {
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
