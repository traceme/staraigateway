<script lang="ts">
	import ProviderCard from '$lib/components/provider-keys/ProviderCard.svelte';
	import ProviderPanel from '$lib/components/provider-keys/ProviderPanel.svelte';
	import type { ProviderDef } from '$lib/server/providers';

	let { data } = $props();

	let activeProvider = $state<ProviderDef | null>(null);

	const globalProviders = $derived(data.providers.filter((p: ProviderDef) => p.group === 'global' || p.group === 'custom'));
	const chinaProviders = $derived(data.providers.filter((p: ProviderDef) => p.group === 'china'));

	function getKeyCount(providerId: string): number {
		return data.providerKeys.filter((k: { provider: string; isActive: boolean }) => k.provider === providerId && k.isActive).length;
	}

	function getKeysForProvider(providerId: string) {
		return data.providerKeys.filter((k: { provider: string }) => k.provider === providerId);
	}
</script>

<svelte:head>
	<title>Provider Keys - StarAIGateway</title>
</svelte:head>

{#if data.accessDenied}
	<div class="flex items-center justify-center py-20">
		<div class="text-center">
			<h2 class="text-lg font-semibold text-zinc-300">Access Denied</h2>
			<p class="mt-2 text-sm text-zinc-500">Only organization owners and admins can manage provider keys.</p>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-5xl">
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-zinc-100">Provider Keys</h1>
			<p class="mt-1 text-sm text-zinc-500">
				Add your LLM provider API keys to enable AI access for your team
			</p>
		</div>

		<!-- Global Providers -->
		<section class="mb-8">
			<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
				Global Providers
			</h2>
			<div class="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{#each globalProviders as provider (provider.id)}
					<ProviderCard
						{provider}
						keyCount={getKeyCount(provider.id)}
						onclick={() => (activeProvider = provider)}
					/>
				{/each}
			</div>
		</section>

		<!-- China Providers -->
		<section>
			<h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
				China Providers
			</h2>
			<div class="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{#each chinaProviders as provider (provider.id)}
					<ProviderCard
						{provider}
						keyCount={getKeyCount(provider.id)}
						onclick={() => (activeProvider = provider)}
					/>
				{/each}
			</div>
		</section>
	</div>

	<!-- Slide-out panel -->
	{#if activeProvider}
		<ProviderPanel
			provider={activeProvider}
			existingKeys={getKeysForProvider(activeProvider.id)}
			orgSlug={data.currentOrg.slug}
			onclose={() => (activeProvider = null)}
		/>
	{/if}
{/if}
