<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from 'svelte-i18n';

	type Member = {
		userId: string;
		name: string;
		role: string;
	};

	type Props = {
		member: Member;
		isOwner: boolean;
		orgSlug: string;
	};

	let { member, isOwner, orgSlug }: Props = $props();

	let open = $state(false);
	let confirmRemove = $state(false);
	let confirmRoleChange = $state(false);
	let newRole = $state<'admin' | 'member'>(member.role === 'admin' ? 'member' : 'admin');

	function toggle() {
		open = !open;
		if (!open) {
			confirmRemove = false;
			confirmRoleChange = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			confirmRemove = false;
			confirmRoleChange = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative">
	<button
		class="rounded p-1 text-zinc-400 hover:text-zinc-200"
		aria-haspopup="true"
		aria-expanded={open}
		onclick={toggle}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<circle cx="8" cy="3" r="1.5" />
			<circle cx="8" cy="8" r="1.5" />
			<circle cx="8" cy="13" r="1.5" />
		</svg>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-30" onclick={() => (open = false)} onkeydown={() => {}}></div>
		<div
			class="absolute right-0 z-40 mt-1 w-56 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
			role="menu"
		>
			{#if confirmRemove}
				<div class="px-3 py-2">
					<p class="text-xs text-zinc-300">
						Remove {member.name}? Their API keys will be deactivated.
					</p>
					<div class="mt-2 flex gap-2">
						<form method="POST" action="/org/{orgSlug}/members?/removeMember" use:enhance>
							<input type="hidden" name="userId" value={member.userId} />
							<button
								type="submit"
								class="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
								role="menuitem"
							>
								{$t('common.confirm')}
							</button>
						</form>
						<button
							class="rounded bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
							onclick={() => (confirmRemove = false)}
							role="menuitem"
						>
							{$t('common.cancel')}
						</button>
					</div>
				</div>
			{:else if confirmRoleChange}
				<div class="px-3 py-2">
					<p class="text-xs text-zinc-300">
						{$t('members.change_role')}: {member.name} → {newRole}?
					</p>
					<div class="mt-2 flex gap-2">
						<form method="POST" action="/org/{orgSlug}/members?/changeRole" use:enhance>
							<input type="hidden" name="userId" value={member.userId} />
							<input type="hidden" name="role" value={newRole} />
							<button
								type="submit"
								class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
								role="menuitem"
							>
								{$t('common.confirm')}
							</button>
						</form>
						<button
							class="rounded bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
							onclick={() => (confirmRoleChange = false)}
							role="menuitem"
						>
							{$t('common.cancel')}
						</button>
					</div>
				</div>
			{:else}
				{#if isOwner && member.role !== 'owner'}
					<button
						class="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
						role="menuitem"
						onclick={() => (confirmRoleChange = true)}
					>
						{$t('members.change_role')}
					</button>
				{/if}
				<a
					href="/org/{orgSlug}/api-keys"
					class="block w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
					role="menuitem"
				>
					View Keys
				</a>
				{#if member.role !== 'owner'}
					<button
						class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700"
						role="menuitem"
						onclick={() => (confirmRemove = true)}
					>
						{$t('members.remove_member')}
					</button>
				{/if}
			{/if}
		</div>
	{/if}
</div>
