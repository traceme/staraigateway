<script lang="ts">
	import OnboardingChecklist from '$lib/components/dashboard/OnboardingChecklist.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.orgName} Dashboard - LLMTokenHub</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<h1 class="text-2xl font-bold text-zinc-50">{data.orgName} Dashboard</h1>

	<OnboardingChecklist />

	<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
		<p class="text-sm text-zinc-400">
			Your dashboard will show usage stats and team activity once you set up provider keys.
		</p>
	</div>
</div>
