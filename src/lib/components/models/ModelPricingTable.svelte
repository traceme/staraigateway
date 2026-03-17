<script lang="ts">
	import { t } from 'svelte-i18n';

	type Model = {
		name: string;
		provider: string;
		inputPrice: number;
		outputPrice: number;
		contextWindow: string;
		hasKey: boolean;
	};

	type Props = {
		models: Model[];
	};

	let { models }: Props = $props();

	type SortKey = 'provider' | 'name' | 'inputPrice' | 'outputPrice' | 'contextWindow' | 'hasKey';
	let sortKey = $state<SortKey>('provider');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function formatPrice(price: number): string {
		if (price < 0.1) return `$${price.toFixed(3)}/1M`;
		return `$${price.toFixed(2)}/1M`;
	}

	let sortedModels = $derived.by(() => {
		return [...models].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
			}
			if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
				return sortDir === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
			}
			const aStr = String(aVal ?? '');
			const bStr = String(bVal ?? '');
			return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
		});
	});

	const columns: { key: SortKey; labelKey: string }[] = [
		{ key: 'provider', labelKey: 'models.table.provider' },
		{ key: 'name', labelKey: 'models.table.name' },
		{ key: 'inputPrice', labelKey: 'models.table.input_price' },
		{ key: 'outputPrice', labelKey: 'models.table.output_price' },
		{ key: 'contextWindow', labelKey: 'common.name' },
		{ key: 'hasKey', labelKey: 'common.status' }
	];
</script>

<div class="overflow-x-auto rounded-lg border border-zinc-800">
	<table class="w-full">
		<thead>
			<tr class="bg-zinc-900">
				{#each columns as col}
					<th
						class="cursor-pointer select-none px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-400"
						onclick={() => toggleSort(col.key)}
					>
						{$t(col.labelKey)}
						{#if sortKey === col.key}
							<span class="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedModels as model}
				<tr class="border-b border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800/50">
					<td class="px-4 py-3">{model.provider}</td>
					<td class="px-4 py-3 font-mono text-xs">{model.name}</td>
					<td class="px-4 py-3">{formatPrice(model.inputPrice)}</td>
					<td class="px-4 py-3">{formatPrice(model.outputPrice)}</td>
					<td class="px-4 py-3">{model.contextWindow}</td>
					<td class="px-4 py-3">
						{#if model.hasKey}
							<span class="inline-flex items-center gap-1.5">
								<span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>
								{$t('common.active')}
							</span>
						{:else}
							<span class="inline-flex items-center gap-1.5 text-zinc-500">
								<span class="inline-block h-2 w-2 rounded-full bg-zinc-600"></span>
								No key
							</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
