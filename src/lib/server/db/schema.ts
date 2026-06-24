import {
	pgTable,
	text,
	timestamp,
	primaryKey,
	integer,
	jsonb,
	uuid,
	boolean,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from '@auth/core/adapters';

// ── Auth.js v5 required tables ────────────────────────────────────────────────

export const users = pgTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'),
	email: text('email').unique(),
	emailVerified: timestamp('email_verified', { mode: 'date' }),
	image: text('image'),
	passwordHash: text('password_hash'),
	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
});

export const accounts = pgTable(
	'account',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').$type<AdapterAccountType>().notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('provider_account_id').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const sessions = pgTable('session', {
	sessionToken: text('session_token').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date' }).notNull()
});

export const verificationTokens = pgTable(
	'verification_token',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull()
	},
	(table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ── Application tables ────────────────────────────────────────────────────────

export const sentenceHistory = pgTable(
	'sentence_history',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
		sentenceHash: text('sentence_hash').notNull(),
		sentenceText: text('sentence_text').notNull(),
		parsedResult: jsonb('parsed_result').notNull(),
		isFavorited: boolean('is_favorited').default(false).notNull(),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [
		index('sentence_history_user_id_idx').on(table.userId),
		index('sentence_history_hash_idx').on(table.sentenceHash)
	]
);

export const parseFeedback = pgTable(
	'parse_feedback',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
		sentenceHash: text('sentence_hash').notNull(),
		sentenceText: text('sentence_text').notNull(),
		reason: text('reason'),
		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [index('parse_feedback_hash_idx').on(table.sentenceHash)]
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
	sentenceHistory: many(sentenceHistory),
	parseFeedback: many(parseFeedback)
}));

export const sentenceHistoryRelations = relations(sentenceHistory, ({ one }) => ({
	user: one(users, { fields: [sentenceHistory.userId], references: [users.id] })
}));

export const parseFeedbackRelations = relations(parseFeedback, ({ one }) => ({
	user: one(users, { fields: [parseFeedback.userId], references: [users.id] })
}));
