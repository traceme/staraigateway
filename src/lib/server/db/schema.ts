import {
	pgTable,
	text,
	boolean,
	timestamp,
	unique,
	index,
	integer,
	numeric
} from 'drizzle-orm/pg-core';

// All tables use app_ prefix to coexist with LiteLLM's Prisma-managed tables

export const appUsers = pgTable(
	'app_users',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull().unique(),
		passwordHash: text('password_hash'), // nullable for OAuth-only users
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
		defaultRpmLimit: integer('default_rpm_limit'),
		defaultTpmLimit: integer('default_tpm_limit'),
		smartRoutingCheapModel: text('smart_routing_cheap_model'),
		smartRoutingExpensiveModel: text('smart_routing_expensive_model'),
		cacheTtlSeconds: integer('cache_ttl_seconds').notNull().default(3600),
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

export const appProviderKeys = pgTable(
	'app_provider_keys',
	{
		id: text('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => appOrganizations.id),
		provider: text('provider').notNull(), // e.g., 'openai', 'anthropic', 'google', 'deepseek'
		label: text('label').notNull(), // e.g., 'Production', 'Dev team'
		encryptedKey: text('encrypted_key').notNull(), // IV:ciphertext:authTag as hex
		baseUrl: text('base_url'), // nullable, for custom OpenAI-compatible endpoints
		models: text('models'), // nullable, JSON string of discovered model names
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('app_provider_keys_org_provider_idx').on(table.orgId, table.provider),
		unique('app_provider_keys_org_provider_label_unique').on(
			table.orgId,
			table.provider,
			table.label
		)
	]
);

export const appApiKeys = pgTable(
	'app_api_keys',
	{
		id: text('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => appOrganizations.id),
		userId: text('user_id')
			.notNull()
			.references(() => appUsers.id),
		name: text('name').notNull(), // e.g., 'Cursor', 'Claude Code CLI'
		keyPrefix: text('key_prefix').notNull(), // first 12 chars for display (e.g., 'sk-th-abc123')
		keyHash: text('key_hash').notNull(), // SHA-256 hash of full key
		rpmLimit: integer('rpm_limit'),
		tpmLimit: integer('tpm_limit'),
		smartRouting: boolean('smart_routing').notNull().default(false),
		isActive: boolean('is_active').notNull().default(true),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('app_api_keys_key_hash_idx').on(table.keyHash),
		index('app_api_keys_org_user_idx').on(table.orgId, table.userId)
	]
);

export const appUsageLogs = pgTable(
	'app_usage_logs',
	{
		id: text('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => appOrganizations.id),
		userId: text('user_id')
			.notNull()
			.references(() => appUsers.id),
		apiKeyId: text('api_key_id')
			.notNull()
			.references(() => appApiKeys.id),
		model: text('model').notNull(),
		provider: text('provider').notNull(),
		endpoint: text('endpoint').notNull(), // '/v1/chat/completions' or '/v1/embeddings'
		inputTokens: integer('input_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		cost: numeric('cost', { precision: 12, scale: 6 }).notNull().default('0'),
		latencyMs: integer('latency_ms'),
		status: text('status').notNull().default('success'), // 'success' | 'error'
		isStreaming: boolean('is_streaming').notNull().default(false),
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('app_usage_logs_org_created_idx').on(table.orgId, table.createdAt),
		index('app_usage_logs_user_created_idx').on(table.userId, table.createdAt),
		index('app_usage_logs_org_model_idx').on(table.orgId, table.model)
	]
);

export const appOauthAccounts = pgTable(
	'app_oauth_accounts',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => appUsers.id),
		provider: text('provider').notNull(), // 'google' | 'github'
		providerUserId: text('provider_user_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('app_oauth_accounts_provider_user_unique').on(table.provider, table.providerUserId),
		index('app_oauth_accounts_user_id_idx').on(table.userId)
	]
);

export const appOrgInvitations = pgTable(
	'app_org_invitations',
	{
		id: text('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => appOrganizations.id),
		email: text('email').notNull(),
		role: text('role').notNull(), // 'admin' | 'member'
		token: text('token').notNull().unique(),
		invitedBy: text('invited_by')
			.notNull()
			.references(() => appUsers.id),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		acceptedAt: timestamp('accepted_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('app_org_invitations_token_idx').on(table.token),
		index('app_org_invitations_org_email_idx').on(table.orgId, table.email)
	]
);

export const appBudgets = pgTable(
	'app_budgets',
	{
		id: text('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => appOrganizations.id),
		userId: text('user_id').references(() => appUsers.id), // null = default (org-wide or role-scoped)
		role: text('role'), // null = individual or org-wide; 'owner' | 'admin' | 'member' = role-scoped default
		hardLimitCents: integer('hard_limit_cents'), // in cents for precision, null = no hard limit
		softLimitCents: integer('soft_limit_cents'), // in cents, null = no soft limit
		resetDay: integer('reset_day').notNull().default(1), // 1-28
		isOrgDefault: boolean('is_org_default').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique('app_budgets_org_user_unique').on(table.orgId, table.userId),
		index('app_budgets_org_default_idx').on(table.orgId, table.isOrgDefault),
		unique('app_budgets_org_role_unique').on(table.orgId, table.role)
	]
);
