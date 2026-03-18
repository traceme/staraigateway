import { db } from '$lib/server/db';
import { appAuditLogs } from '$lib/server/db/schema';

export function recordAuditEvent(
	orgId: string,
	actorId: string,
	actionType: string,
	targetType: string,
	targetId: string | null,
	metadata: Record<string, unknown> | null = null
): void {
	// Fire-and-forget: do NOT await this in calling code
	db.insert(appAuditLogs)
		.values({
			id: crypto.randomUUID(),
			orgId,
			actorId,
			actionType,
			targetType,
			targetId,
			metadata,
			createdAt: new Date()
		})
		.then(() => {})
		.catch((err) => {
			console.error(`Failed to record audit event: ${actionType}`, err);
		});
}
