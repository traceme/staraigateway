<script lang="ts">
	type Props = {
		label: string;
		value: string;
		trend?: { direction: 'up' | 'down'; percent: number };
	};

	let { label, value, trend }: Props = $props();
</script>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	<p class="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
	<p class="mt-2 text-3xl font-bold text-zinc-50">{value}</p>
	{#if trend}
		<p class="mt-1 text-sm {trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}">
			{trend.direction === 'up' ? '\u25B2' : '\u25BC'}
			{trend.percent}%
		</p>
	{/if}
</div>
