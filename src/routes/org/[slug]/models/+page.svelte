<script lang="ts">
	import ModelPricingTable from '$lib/components/models/ModelPricingTable.svelte';

	let { data } = $props();

	let search = $state('');

	let filteredModels = $derived(
		search
			? data.models.filter(
					(m: any) =>
						m.name.toLowerCase().includes(search.toLowerCase()) ||
						m.provider.toLowerCase().includes(search.toLowerCase())
				)
			: data.models
	);
</script>

<svelte:head>
	<title>Models - StarAIGateway</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-zinc-50">Models</h1>
		<input
			type="text"
			placeholder="Search models..."
			class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
			bind:value={search}
		/>
	</div>

	{#if filteredModels.length > 0}
		<ModelPricingTable models={filteredModels} />
	{:else if data.models.length === 0}
		<!-- Empty state: no models at all -->
		<div class="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
			<h2 class="text-lg font-semibold text-zinc-300">No models available</h2>
			<p class="mt-2 max-w-md text-sm text-zinc-500">
				Add a provider key to see available models and pricing.
			</p>
		</div>
	{:else}
		<!-- Empty state: search returned no results -->
		<div class="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
			<h2 class="text-lg font-semibold text-zinc-300">No models found</h2>
			<p class="mt-2 max-w-md text-sm text-zinc-500">
				No models match your search. Try a different query.
			</p>
		</div>
	{/if}
</div>
