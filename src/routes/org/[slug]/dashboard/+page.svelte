<script lang="ts">
	import OnboardingChecklist from '$lib/components/dashboard/OnboardingChecklist.svelte';
	import AdminKpiCards from '$lib/components/dashboard/AdminKpiCards.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.orgName} Dashboard - LLMTokenHub</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<h1 class="text-2xl font-bold text-zinc-50">{data.orgName} Dashboard</h1>

	{#if data.isAdmin && data.kpi}
		<div class="space-y-4">
			<AdminKpiCards
				members={data.kpi.members}
				activeKeys={data.kpi.activeKeys}
				spendThisMonth={data.kpi.spendThisMonth}
				requestsThisMonth={data.kpi.requestsThisMonth}
			/>

			<div class="flex gap-4 text-sm">
				<a href="/org/{data.currentOrg.slug}/members" class="text-blue-500 underline hover:text-blue-400">
					Manage Members
				</a>
				<a href="/org/{data.currentOrg.slug}/api-keys" class="text-blue-500 underline hover:text-blue-400">
					View API Keys
				</a>
				<a href="/org/{data.currentOrg.slug}/usage" class="text-blue-500 underline hover:text-blue-400">
					Budget Settings
				</a>
			</div>
		</div>

		<div class="border-t border-zinc-800"></div>
	{/if}

	<OnboardingChecklist />

	<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
		<p class="text-sm text-zinc-400">
			Your dashboard will show usage stats and team activity once you set up provider keys.
		</p>
	</div>
</div>
