import { pgTable, text, boolean, timestamp, unique, index } from 'drizzle-orm/pg-core';

// All tables use app_ prefix to coexist with LiteLLM's Prisma-managed tables

export const appUsers = pgTable(
	'app_users',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		name: text('name').notNull(),
		emailVerified: boolean('email_verified').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('app_users_email_idx').on(table.email)]
);

export const appSessions = pgTable(
	'app_sessions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => appUsers.id),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('app_sessions_user_id_idx').on(table.userId)]
);

export const appOrganizations = pgTable(
	'app_organizations',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		litellmOrgId: text('litellm_org_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('app_organizations_slug_idx').on(table.slug)]
);

export const appOrgMembers = pgTable(
	'app_org_members',
	{
		id: text('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => appOrganizations.id),
		userId: text('user_id')
			.notNull()
			.references(() => appUsers.id),
		role: text('role').notNull(), // 'owner' | 'admin' | 'member'
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [unique('app_org_members_org_user_unique').on(table.orgId, table.userId)]
);

export const appEmailVerifications = pgTable('app_email_verifications', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => appUsers.id),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const appPasswordResets = pgTable('app_password_resets', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => appUsers.id),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
