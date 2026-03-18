import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appAuditLogs, appUsers } from '$lib/server/db/schema';
import { eq, and, desc, lt, gte, lte, or, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { currentOrg, membership } = await parent();

	// Admin/owner guard — same pattern as settings/+page.server.ts
	if (membership.role !== 'owner' && membership.role !== 'admin') {
		redirect(302, `/org/${currentOrg.slug}`);
	}

	const limit = 25;
	const cursor = url.searchParams.get('cursor');
	const actionTypes = url.searchParams.getAll('action');
	const startDate = url.searchParams.get('start');
	const endDate = url.searchParams.get('end');

	// Build WHERE conditions
	const conditions = [eq(appAuditLogs.orgId, currentOrg.id)];

	if (actionTypes.length > 0) {
		conditions.push(inArray(appAuditLogs.actionType, actionTypes));
	}
	if (startDate) {
		conditions.push(gte(appAuditLogs.createdAt, new Date(startDate)));
	}
	if (endDate) {
		// End date is inclusive — set to end of day
		const endOfDay = new Date(endDate);
		endOfDay.setHours(23, 59, 59, 999);
		conditions.push(lte(appAuditLogs.createdAt, endOfDay));
	}

	// Cursor-based pagination using compound (created_at, id)
	if (cursor) {
		const [ts, id] = cursor.split('|');
		conditions.push(
			or(
				lt(appAuditLogs.createdAt, new Date(ts)),
				and(eq(appAuditLogs.createdAt, new Date(ts)), lt(appAuditLogs.id, id))
			)!
		);
	}

	const rows = await db
		.select({
			id: appAuditLogs.id,
			actionType: appAuditLogs.actionType,
			targetType: appAuditLogs.targetType,
			targetId: appAuditLogs.targetId,
			metadata: appAuditLogs.metadata,
			createdAt: appAuditLogs.createdAt,
			actorName: appUsers.name,
			actorEmail: appUsers.email
		})
		.from(appAuditLogs)
		.leftJoin(appUsers, eq(appAuditLogs.actorId, appUsers.id))
		.where(and(...conditions))
		.orderBy(desc(appAuditLogs.createdAt), desc(appAuditLogs.id))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	const entries = rows.slice(0, limit);
	const nextCursor =
		hasMore && entries.length > 0
			? `${entries[entries.length - 1].createdAt.toISOString()}|${entries[entries.length - 1].id}`
			: null;

	return {
		entries: entries.map((e) => ({
			...e,
			createdAt: e.createdAt.toISOString(),
			actorName: e.actorName ?? 'Deleted user'
		})),
		nextCursor,
		filters: {
			actionTypes,
			startDate: startDate ?? '',
			endDate: endDate ?? ''
		}
	};
};
