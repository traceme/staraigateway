<script lang="ts">
	import type { ProviderDef } from '$lib/server/providers';

	type Props = {
		provider: ProviderDef;
		keyCount: number;
		onclick: () => void;
	};

	let { provider, keyCount, onclick }: Props = $props();

	const firstLetter = $derived(provider.name.charAt(0).toUpperCase());
</script>

<button
	type="button"
	class="flex w-full items-start gap-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-all hover:border-blue-500 hover:bg-zinc-800"
	{onclick}
>
	<!-- Provider icon (first letter) -->
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-lg font-bold text-zinc-300"
	>
		{firstLetter}
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<h3 class="text-sm font-semibold text-zinc-100">{provider.name}</h3>
			{#if keyCount > 0}
				<span class="inline-flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
					<span class="text-xs text-zinc-400">{keyCount} key{keyCount !== 1 ? 's' : ''}</span>
				</span>
			{:else}
				<span class="inline-flex items-center gap-1">
					<span class="h-1.5 w-1.5 rounded-full bg-zinc-600"></span>
					<span class="text-xs text-zinc-500">No keys</span>
				</span>
			{/if}
		</div>
		<p class="mt-1 text-xs text-zinc-500">{provider.description}</p>
	</div>
</button>
