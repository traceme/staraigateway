<script lang="ts">
	import { t, locale } from 'svelte-i18n';

	type Props = {
		members: number;
		activeKeys: number;
		spendThisMonth: number;
		requestsThisMonth: number;
	};

	let { members, activeKeys, spendThisMonth, requestsThisMonth }: Props = $props();

	function formatCurrency(amount: number): string {
		return `$${amount.toFixed(2)}`;
	}

	function formatNumber(n: number): string {
		return n.toLocaleString($locale ?? 'en');
	}

	const cards = $derived([
		{ labelKey: 'kpi.members', value: formatNumber(members), icon: 'users' },
		{ labelKey: 'kpi.active_keys', value: formatNumber(activeKeys), icon: 'key' },
		{ labelKey: 'kpi.spend_this_month', value: formatCurrency(spendThisMonth), icon: 'dollar' },
		{ labelKey: 'kpi.requests_this_month', value: formatNumber(requestsThisMonth), icon: 'chart' }
	]);
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each cards as card}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-zinc-500">{$t(card.labelKey)}</p>
			<p class="mt-2 text-2xl font-bold text-zinc-50">{card.value}</p>
		</div>
	{/each}
</div>
