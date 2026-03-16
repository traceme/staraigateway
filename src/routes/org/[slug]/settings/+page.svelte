<script lang="ts">
	import OrgSettingsForm from '$lib/components/settings/OrgSettingsForm.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Organization Settings - LLMTokenHub</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-zinc-100">Organization Settings</h1>
		<p class="mt-1 text-sm text-zinc-500">
			Configure organization-wide defaults and policies.
		</p>
	</div>

	<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
		<OrgSettingsForm
			defaultRpmLimit={data.defaultRpmLimit}
			defaultTpmLimit={data.defaultTpmLimit}
			orgSlug={data.currentOrg.slug}
		/>
	</div>
</div>
