<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';

	type Props = {
		range: string;
		from?: string;
		to?: string;
	};

	let { range, from, to }: Props = $props();

	let showCustom = $state(range === 'custom');
	let fromValue = $state(from?.slice(0, 10) ?? '');
	let toValue = $state(to?.slice(0, 10) ?? '');

	function selectRange(r: string) {
		showCustom = false;
		const url = new URL(window.location.href);
		url.searchParams.set('range', r);
		url.searchParams.delete('from');
		url.searchParams.delete('to');
		goto(url.toString(), { replaceState: true });
	}

	function toggleCustom() {
		showCustom = !showCustom;
	}

	function applyCustom() {
		if (!fromValue || !toValue) return;
		const url = new URL(window.location.href);
		url.searchParams.set('range', 'custom');
		url.searchParams.set('from', fromValue);
		url.searchParams.set('to', toValue);
		goto(url.toString(), { replaceState: true });
	}
</script>

<div class="flex items-center gap-2">
	<button
		type="button"
		class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {range === '7'
			? 'bg-zinc-700 text-zinc-100'
			: 'bg-transparent text-zinc-400 hover:text-zinc-300'}"
		onclick={() => selectRange('7')}
	>
		{$t('usage.time_range.7d')}
	</button>
	<button
		type="button"
		class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {range === '30'
			? 'bg-zinc-700 text-zinc-100'
			: 'bg-transparent text-zinc-400 hover:text-zinc-300'}"
		onclick={() => selectRange('30')}
	>
		{$t('usage.time_range.30d')}
	</button>
	<button
		type="button"
		class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {range === 'custom'
			? 'bg-zinc-700 text-zinc-100'
			: 'bg-transparent text-zinc-400 hover:text-zinc-300'}"
		onclick={toggleCustom}
	>
		Custom
	</button>
	{#if showCustom}
		<div class="flex items-center gap-2">
			<input
				type="date"
				class="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300"
				bind:value={fromValue}
			/>
			<span class="text-zinc-500">to</span>
			<input
				type="date"
				class="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300"
				bind:value={toValue}
			/>
			<button
				type="button"
				class="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
				onclick={applyCustom}
			>
				Apply
			</button>
		</div>
	{/if}
</div>
