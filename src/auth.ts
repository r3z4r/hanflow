import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import Google from '@auth/sveltekit/providers/google';
import Credentials from '@auth/sveltekit/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '$lib/server/db';
import { users, accounts, sessions, verificationTokens } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET
} from '$env/static/private';

// TODO(phase-6): implement with bcrypt before enabling credentials login in production
function verifyPassword(_plain: string, _hash: string): never {
	throw new Error('Credentials auth not yet implemented — use OAuth providers');
}

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens
	}),
	secret: AUTH_SECRET,
	providers: [
		Google({
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET
		}),
		GitHub({
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET
		}),
		Credentials({
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;
				const user = await db.query.users.findFirst({
					where: eq(users.email, credentials.email as string)
				});
				if (!user?.passwordHash) return null;
				const valid = await verifyPassword(credentials.password as string, user.passwordHash);
				return valid ? user : null;
			}
		})
	],
	callbacks: {
		session({ session, token }) {
			if (token?.sub) session.user.id = token.sub;
			return session;
		}
	},
	// JWT strategy is required: database sessions use a different callback signature
	// where token is undefined — removing this would silently break session.user.id
	session: { strategy: 'jwt' },
	pages: {
		signIn: '/login',
		error: '/auth/error'
	},
	trustHost: true
});
