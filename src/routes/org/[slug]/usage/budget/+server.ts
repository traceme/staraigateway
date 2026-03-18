import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { recordAuditEvent } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { appBudgets, appOrgMembers, appOrganizations } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) return error(401, 'Unauthorized');

	// Resolve org from slug
	const orgs = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.slug, params.slug))
		.limit(1);

	if (orgs.length === 0) return error(404, 'Organization not found');
	const orgId = orgs[0].id;

	// Verify requesting user is admin or owner of this org
	const membership = await db
		.select()
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, locals.user.id)))
		.limit(1);

	if (membership.length === 0) return error(403, 'Not a member of this organization');
	if (membership[0].role !== 'admin' && membership[0].role !== 'owner') {
		return error(403, 'Only admins and owners can manage budgets');
	}

	const body = await request.json();
	const { userId, role, hardLimit, softLimit, resetDay, isOrgDefault } = body;

	// Validate: hardLimit >= softLimit if both set
	if (
		hardLimit !== null &&
		hardLimit !== undefined &&
		softLimit !== null &&
		softLimit !== undefined &&
		hardLimit < softLimit
	) {
		return json({ error: 'Hard limit must be >= soft limit' }, { status: 400 });
	}
	if (resetDay !== undefined && (resetDay < 1 || resetDay > 28)) {
		return json({ error: 'Reset day must be between 1 and 28' }, { status: 400 });
	}
	// Validate role if provided
	if (role !== undefined && role !== null && !['owner', 'admin', 'member'].includes(role)) {
		return json({ error: 'Role must be owner, admin, or member' }, { status: 400 });
	}

	// Convert dollar amounts to cents (multiply by 100)
	const hardLimitCents =
		hardLimit !== null && hardLimit !== undefined ? Math.round(hardLimit * 100) : null;
	const softLimitCents =
		softLimit !== null && softLimit !== undefined ? Math.round(softLimit * 100) : null;

	// Determine budget type and upsert accordingly:
	// 1. Per-member: userId set, role null, isOrgDefault false
	// 2. Per-role default: userId null, role set, isOrgDefault false
	// 3. Org-wide default: userId null, role null, isOrgDefault true
	let existingWhere;
	if (userId) {
		existingWhere = and(eq(appBudgets.orgId, orgId), eq(appBudgets.userId, userId));
	} else if (role) {
		existingWhere = and(
			eq(appBudgets.orgId, orgId),
			isNull(appBudgets.userId),
			eq(appBudgets.role, role)
		);
	} else if (isOrgDefault) {
		existingWhere = and(eq(appBudgets.orgId, orgId), eq(appBudgets.isOrgDefault, true));
	} else {
		return json({ error: 'Must specify userId, role, or isOrgDefault' }, { status: 400 });
	}

	const existing = await db.select().from(appBudgets).where(existingWhere).limit(1);

	if (existing.length > 0) {
		await db
			.update(appBudgets)
			.set({
				hardLimitCents,
				softLimitCents,
				resetDay: resetDay ?? existing[0].resetDay,
				updatedAt: new Date()
			})
			.where(eq(appBudgets.id, existing[0].id));
	} else {
		await db.insert(appBudgets).values({
			id: crypto.randomUUID(),
			orgId,
			userId: userId ?? null,
			role: role ?? null,
			hardLimitCents,
			softLimitCents,
			resetDay: resetDay ?? 1,
			isOrgDefault: isOrgDefault ?? false
		});
	}

	recordAuditEvent(orgId, locals.user!.id, 'budget_changed', 'budget', userId ?? role ?? 'org_default', { hardLimit, softLimit, resetDay, isOrgDefault: isOrgDefault ?? false });
	return json({ success: true });
};

// DELETE handler for removing a budget
export const DELETE: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) return error(401, 'Unauthorized');

	// Resolve org from slug
	const orgs = await db
		.select()
		.from(appOrganizations)
		.where(eq(appOrganizations.slug, params.slug))
		.limit(1);

	if (orgs.length === 0) return error(404, 'Organization not found');
	const orgId = orgs[0].id;

	// Verify admin/owner role
	const membership = await db
		.select()
		.from(appOrgMembers)
		.where(and(eq(appOrgMembers.orgId, orgId), eq(appOrgMembers.userId, locals.user.id)))
		.limit(1);

	if (membership.length === 0) return error(403, 'Not a member of this organization');
	if (membership[0].role !== 'admin' && membership[0].role !== 'owner') {
		return error(403, 'Only admins and owners can manage budgets');
	}

	const body = await request.json();
	const { userId, role } = body;

	// Delete per-member budget or per-role budget
	if (userId) {
		await db
			.delete(appBudgets)
			.where(and(eq(appBudgets.orgId, orgId), eq(appBudgets.userId, userId)));
	} else if (role) {
		await db
			.delete(appBudgets)
			.where(
				and(eq(appBudgets.orgId, orgId), isNull(appBudgets.userId), eq(appBudgets.role, role))
			);
	}

	recordAuditEvent(orgId, locals.user!.id, 'budget_changed', 'budget', userId ?? role ?? 'org_default', { action: 'deleted' });
	return json({ success: true });
};
