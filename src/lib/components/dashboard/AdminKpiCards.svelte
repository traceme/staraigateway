<script lang="ts">
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
		return n.toLocaleString('en-US');
	}

	const cards = $derived([
		{ label: 'Members', value: formatNumber(members), icon: 'users' },
		{ label: 'Active Keys', value: formatNumber(activeKeys), icon: 'key' },
		{ label: 'Spend This Month', value: formatCurrency(spendThisMonth), icon: 'dollar' },
		{ label: 'Requests This Month', value: formatNumber(requestsThisMonth), icon: 'chart' }
	]);
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each cards as card}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-medium uppercase tracking-wider text-zinc-500">{card.label}</p>
			<p class="mt-2 text-2xl font-bold text-zinc-50">{card.value}</p>
		</div>
	{/each}
</div>
