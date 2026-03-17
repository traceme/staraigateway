<script lang="ts">
	import OrgSettingsForm from '$lib/components/settings/OrgSettingsForm.svelte';
	import SmartRoutingSettings from '$lib/components/settings/SmartRoutingSettings.svelte';
	import CacheTtlSetting from '$lib/components/settings/CacheTtlSetting.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Organization Settings - StarAIGateway</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-zinc-100">Organization Settings</h1>
		<p class="mt-1 text-sm text-zinc-500">
			Configure organization-wide defaults and policies.
		</p>
	</div>

	<div class="space-y-8">
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
			<OrgSettingsForm
				defaultRpmLimit={data.defaultRpmLimit}
				defaultTpmLimit={data.defaultTpmLimit}
				orgSlug={data.currentOrg.slug}
			/>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
			<SmartRoutingSettings
				cheapModel={data.smartRoutingCheapModel}
				expensiveModel={data.smartRoutingExpensiveModel}
				orgSlug={data.currentOrg.slug}
			/>
		</div>

		<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
			<CacheTtlSetting
				cacheTtlSeconds={data.cacheTtlSeconds}
				orgSlug={data.currentOrg.slug}
				redisAvailable={data.redisAvailable}
			/>
		</div>
	</div>
</div>
