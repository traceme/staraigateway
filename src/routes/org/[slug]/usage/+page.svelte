<script lang="ts">
	import { goto } from '$app/navigation';
	import KpiCard from '$lib/components/usage/KpiCard.svelte';
	import UsageTabs from '$lib/components/usage/UsageTabs.svelte';
	import TimeRangePicker from '$lib/components/usage/TimeRangePicker.svelte';
	import CostTrendChart from '$lib/components/usage/CostTrendChart.svelte';
	import BreakdownBarChart from '$lib/components/usage/BreakdownBarChart.svelte';
	import UsageTable from '$lib/components/usage/UsageTable.svelte';

	let { data } = $props();

	let activeTab = $state(data.tab);

	function formatCost(v: number): string {
		return `$${v.toFixed(2)}`;
	}

	function formatNumber(v: number): string {
		return v.toLocaleString();
	}

	function onTabChange(tab: string) {
		activeTab = tab;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { replaceState: true });
	}

	const hasData = $derived(data.dailyCosts.length > 0 || data.kpi.totalRequests > 0);

	// Overview table columns
	const overviewColumns = [
		{ key: 'model', label: 'Model', sortable: true },
		{ key: 'provider', label: 'Provider', sortable: true },
		{ key: 'requests', label: 'Requests', sortable: true, format: formatNumber },
		{ key: 'inputTokens', label: 'Input Tokens', sortable: true, format: formatNumber },
		{ key: 'outputTokens', label: 'Output Tokens', sortable: true, format: formatNumber },
		{ key: 'cost', label: 'Cost', sortable: true, format: formatCost }
	];

	// Member table columns (includes Role for TRACK-03)
	const memberColumns = [
		{ key: 'name', label: 'Member', sortable: true },
		{ key: 'role', label: 'Role', sortable: true },
		{ key: 'requests', label: 'Requests', sortable: true, format: formatNumber },
		{ key: 'inputTokens', label: 'Input Tokens', sortable: true, format: formatNumber },
		{ key: 'outputTokens', label: 'Output Tokens', sortable: true, format: formatNumber },
		{ key: 'cost', label: 'Cost', sortable: true, format: formatCost }
	];

	// Model table columns
	const modelColumns = [
		{ key: 'model', label: 'Model', sortable: true },
		{ key: 'provider', label: 'Provider', sortable: true },
		{ key: 'requests', label: 'Requests', sortable: true, format: formatNumber },
		{ key: 'inputTokens', label: 'Input Tokens', sortable: true, format: formatNumber },
		{ key: 'outputTokens', label: 'Output Tokens', sortable: true, format: formatNumber },
		{ key: 'cost', label: 'Cost', sortable: true, format: formatCost }
	];

	// Bar chart data
	const modelBarData = $derived(
		data.modelBreakdown.map((m: any) => ({ label: m.model, value: m.cost }))
	);

	const memberBarData = $derived(
		data.memberBreakdown.map((m: any) => ({ label: m.name, value: m.cost }))
	);
</script>

<svelte:head>
	<title>Usage - LLMTokenHub</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-zinc-50">Usage</h1>
		<TimeRangePicker range={data.range} from={data.fromDate} to={data.toDate} />
	</div>

	{#if hasData}
		<!-- KPI Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<KpiCard label="Total Spend" value={formatCost(data.kpi.totalCost)} />
			<KpiCard label="Total Requests" value={formatNumber(data.kpi.totalRequests)} />
			<KpiCard label="Avg Cost / Request" value={formatCost(data.kpi.avgCost)} />
		</div>

		<!-- Tabs -->
		<UsageTabs {activeTab} {onTabChange} />

		<!-- Tab Content -->
		{#if activeTab === 'overview'}
			<div class="space-y-6">
				<CostTrendChart data={data.dailyCosts} />
				{#if modelBarData.length > 0}
					<BreakdownBarChart data={modelBarData} />
				{/if}
				<UsageTable columns={overviewColumns} rows={data.modelBreakdown} />
			</div>
		{:else if activeTab === 'member'}
			<div class="space-y-6">
				<CostTrendChart data={data.dailyCosts} />

				<!-- Role summary cards (TRACK-03: per-team breakdown by role) -->
				{#if data.roleBreakdown.length > 0}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{#each data.roleBreakdown as rb}
							<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
								<p class="text-xs uppercase tracking-wider text-zinc-500">
									{rb.role === 'owner' ? 'Owners' : rb.role === 'admin' ? 'Admins' : 'Members'}
								</p>
								<p class="mt-1 text-xl font-bold text-zinc-50">{formatCost(rb.cost)}</p>
								<p class="text-xs text-zinc-500">
									{rb.members} {rb.members === 1 ? 'member' : 'members'} &middot; {formatNumber(rb.requests)} requests
								</p>
							</div>
						{/each}
					</div>
				{/if}

				{#if memberBarData.length > 0}
					<BreakdownBarChart data={memberBarData} />
				{/if}
				<UsageTable columns={memberColumns} rows={data.memberBreakdown} />
			</div>
		{:else if activeTab === 'model'}
			<div class="space-y-6">
				<CostTrendChart data={data.dailyCosts} />
				{#if modelBarData.length > 0}
					<BreakdownBarChart data={modelBarData} />
				{/if}
				<UsageTable columns={modelColumns} rows={data.modelBreakdown} />
			</div>
		{/if}
	{:else}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
			<h2 class="text-lg font-semibold text-zinc-300">No usage data yet</h2>
			<p class="mt-2 max-w-md text-sm text-zinc-500">
				Usage data will appear here once team members start making API requests.
			</p>
		</div>
	{/if}
</div>
