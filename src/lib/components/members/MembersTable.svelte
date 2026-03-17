<script lang="ts">
	import { enhance } from '$app/forms';
	import { t, locale } from 'svelte-i18n';
	import RoleBadge from './RoleBadge.svelte';
	import MemberActionMenu from './MemberActionMenu.svelte';

	type Member = {
		userId: string;
		name: string;
		email: string;
		role: string;
		joinedAt: Date;
		usageThisMonth: number;
	};

	type PendingInvitation = {
		id: string;
		email: string;
		role: string;
		createdAt: Date;
		inviterName: string;
	};

	type Props = {
		members: Member[];
		pendingInvitations: PendingInvitation[];
		isAdmin: boolean;
		isOwner: boolean;
		orgSlug: string;
	};

	let { members, pendingInvitations, isAdmin, isOwner, orgSlug }: Props = $props();

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString($locale ?? 'en', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatCost(cost: number): string {
		return `$${cost.toFixed(2)}`;
	}
</script>

<!-- Members Table -->
<div class="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
	<table class="w-full">
		<thead>
			<tr class="border-b border-zinc-800 bg-zinc-900/80">
				<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.name')}</th>
				<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.email')}</th>
				<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.role')}</th>
				<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.date')}</th>
				<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('usage.title')}</th>
				{#if isAdmin}
					<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each members as member (member.userId)}
				<tr class="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
					<td class="px-4 py-3 text-sm font-medium text-zinc-200">{member.name}</td>
					<td class="px-4 py-3 text-sm text-zinc-400">{member.email}</td>
					<td class="px-4 py-3">
						<RoleBadge role={member.role as 'owner' | 'admin' | 'member'} />
					</td>
					<td class="px-4 py-3 text-sm text-zinc-400">{formatDate(member.joinedAt)}</td>
					<td class="px-4 py-3 text-sm text-zinc-400">{formatCost(member.usageThisMonth)}</td>
					{#if isAdmin}
						<td class="px-4 py-3 text-right">
							{#if member.role !== 'owner' || isOwner}
								<MemberActionMenu {member} {isOwner} {orgSlug} />
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Pending Invitations -->
{#if isAdmin && pendingInvitations.length > 0}
	<div class="mt-6">
		<h3 class="mb-3 text-sm font-semibold text-zinc-300">{$t('members.pending_invitations')}</h3>
		<div class="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
			<table class="w-full">
				<thead>
					<tr class="border-b border-zinc-800 bg-zinc-900/80">
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.email')}</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.role')}</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.name')}</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">{$t('common.date')}</th>
						<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
					</tr>
				</thead>
				<tbody>
					{#each pendingInvitations as invitation (invitation.id)}
						<tr class="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
							<td class="px-4 py-3 text-sm text-zinc-300">{invitation.email}</td>
							<td class="px-4 py-3">
								<RoleBadge role="pending" />
							</td>
							<td class="px-4 py-3 text-sm text-zinc-400">{invitation.inviterName}</td>
							<td class="px-4 py-3 text-sm text-zinc-400">{formatDate(invitation.createdAt)}</td>
							<td class="px-4 py-3 text-right">
								<form method="POST" action="/org/{orgSlug}/members?/revokeInvitation" use:enhance>
									<input type="hidden" name="invitationId" value={invitation.id} />
									<button
										type="submit"
										class="text-xs font-medium text-red-400 hover:text-red-300"
										title="Revoke invitation"
									>
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M3 3l8 8M11 3l-8 8" />
										</svg>
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
