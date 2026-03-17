<script lang="ts">
	import { t } from 'svelte-i18n';
	import MembersTable from '$lib/components/members/MembersTable.svelte';
	import InvitePanel from '$lib/components/members/InvitePanel.svelte';

	let { data } = $props();

	let showInvitePanel = $state(false);
</script>

<svelte:head>
	<title>{$t('members.title')} - StarAIGateway</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-zinc-100">{$t('members.title')}</h1>
			<p class="mt-1 text-sm text-zinc-500">
				{$t('members.description')}
			</p>
		</div>
		{#if data.isAdmin}
			<button
				onclick={() => (showInvitePanel = true)}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				{$t('members.invite')}
			</button>
		{/if}
	</div>

	<MembersTable
		members={data.members}
		pendingInvitations={data.pendingInvitations}
		isAdmin={data.isAdmin}
		isOwner={data.isOwner}
		orgSlug={data.currentOrg.slug}
	/>
</div>

{#if showInvitePanel}
	<InvitePanel orgSlug={data.currentOrg.slug} onClose={() => (showInvitePanel = false)} />
{/if}
