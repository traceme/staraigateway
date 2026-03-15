import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
	appUsers,
	appSessions,
	appOrganizations,
	appOrgMembers,
	appEmailVerifications,
	appPasswordResets,
	appProviderKeys,
	appApiKeys
} from '$lib/server/db/schema';

// Select types (for reading from DB)
export type User = InferSelectModel<typeof appUsers>;
export type Session = InferSelectModel<typeof appSessions>;
export type Organization = InferSelectModel<typeof appOrganizations>;
export type OrgMember = InferSelectModel<typeof appOrgMembers>;
export type EmailVerification = InferSelectModel<typeof appEmailVerifications>;
export type PasswordReset = InferSelectModel<typeof appPasswordResets>;

// Insert types (for writing to DB)
export type NewUser = InferInsertModel<typeof appUsers>;
export type NewOrganization = InferInsertModel<typeof appOrganizations>;
export type NewOrgMember = InferInsertModel<typeof appOrgMembers>;

// Provider key types
export type ProviderKey = InferSelectModel<typeof appProviderKeys>;
export type NewProviderKey = InferInsertModel<typeof appProviderKeys>;

// API key types
export type ApiKey = InferSelectModel<typeof appApiKeys>;
export type NewApiKey = InferInsertModel<typeof appApiKeys>;

// Role type
export type OrgRole = 'owner' | 'admin' | 'member';
