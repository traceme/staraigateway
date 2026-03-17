<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { t } from 'svelte-i18n';
	import KpiCard from '$lib/components/usage/KpiCard.svelte';
	import UsageTabs from '$lib/components/usage/UsageTabs.svelte';
	import TimeRangePicker from '$lib/components/usage/TimeRangePicker.svelte';
	import CostTrendChart from '$lib/components/usage/CostTrendChart.svelte';
	import BreakdownBarChart from '$lib/components/usage/BreakdownBarChart.svelte';
	import UsageTable from '$lib/components/usage/UsageTable.svelte';
	import BudgetPanel from '$lib/components/budget/BudgetPanel.svelte';
	import BudgetDefaultsForm from '$lib/components/budget/BudgetDefaultsForm.svelte';

	let { data } = $props();

	let activeTab = $state(data.tab);
	let selectedMember = $state<any>(null);

	const orgSlug = $derived($page.params.slug);

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
	const overviewColumns = $derived([
		{ key: 'model', label: $t('usage.table.model'), sortable: true },
		{ key: 'provider', label: $t('usage.table.provider'), sortable: true },
		{ key: 'requests', label: $t('usage.table.requests'), sortable: true, format: formatNumber },
		{ key: 'inputTokens', label: $t('usage.table.input_tokens'), sortable: true, format: formatNumber },
		{ key: 'outputTokens', label: $t('usage.table.output_tokens'), sortable: true, format: formatNumber },
		{ key: 'cost', label: $t('usage.table.cost'), sortable: true, format: formatCost }
	]);

	// Member table columns (includes Role for TRACK-03)
	const memberColumns = $derived([
		{ key: 'name', label: $t('usage.table.member'), sortable: true },
		{ key: 'role', label: $t('usage.table.role'), sortable: true },
		{ key: 'requests', label: $t('usage.table.requests'), sortable: true, format: formatNumber },
		{ key: 'inputTokens', label: $t('usage.table.input_tokens'), sortable: true, format: formatNumber },
		{ key: 'outputTokens', label: $t('usage.table.output_tokens'), sortable: true, format: formatNumber },
		{ key: 'cost', label: $t('usage.table.cost'), sortable: true, format: formatCost },
		{
			key: '_budget',
			label: $t('usage.table.budget'),
			sortable: false,
			render: (row: any) => row.budgetSource ? $t('usage.edit_budget') : $t('usage.set_budget')
		}
	]);

	// Model table columns
	const modelColumns = $derived([
		{ key: 'model', label: $t('usage.table.model'), sortable: true },
		{ key: 'provider', label: $t('usage.table.provider'), sortable: true },
		{ key: 'requests', label: $t('usage.table.requests'), sortable: true, format: formatNumber },
		{ key: 'inputTokens', label: $t('usage.table.input_tokens'), sortable: true, format: formatNumber },
		{ key: 'outputTokens', label: $t('usage.table.output_tokens'), sortable: true, format: formatNumber },
		{ key: 'cost', label: $t('usage.table.cost'), sortable: true, format: formatCost }
	]);

	// Bar chart data
	const modelBarData = $derived(
		data.modelBreakdown.map((m: any) => ({ label: m.model, value: m.cost }))
	);

	const memberBarData = $derived(
		data.memberBreakdown.map((m: any) => ({ label: m.name, value: m.cost }))
	);
</script>

<svelte:head>
	<title>{$t('usage.title')} - StarAIGateway</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-zinc-50">{$t('usage.title')}</h1>
		<TimeRangePicker range={data.range} from={data.fromDate} to={data.toDate} />
	</div>

	{#if hasData}
		<!-- KPI Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<KpiCard label={$t('usage.total_spend')} value={formatCost(data.kpi.totalCost)} />
			<KpiCard label={$t('usage.total_requests')} value={formatNumber(data.kpi.totalRequests)} />
			<KpiCard label={$t('usage.avg_cost')} value={formatCost(data.kpi.avgCost)} />
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
									{rb.role === 'owner' ? $t('usage.role_owners') : rb.role === 'admin' ? $t('usage.role_admins') : $t('usage.role_members')}
								</p>
								<p class="mt-1 text-xl font-bold text-zinc-50">{formatCost(rb.cost)}</p>
								<p class="text-xs text-zinc-500">
									{rb.members} {rb.members === 1 ? 'member' : 'members'} &middot; {formatNumber(rb.requests)} {$t('usage.table.requests').toLowerCase()}
								</p>
							</div>
						{/each}
					</div>
				{/if}

				{#if memberBarData.length > 0}
					<BreakdownBarChart data={memberBarData} />
				{/if}

				<!-- Member table with budget actions -->
				<div class="overflow-x-auto rounded-lg border border-zinc-800">
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="border-b border-zinc-800 bg-zinc-900/50">
								{#each memberColumns as col}
									<th class="px-4 py-3 text-xs font-normal uppercase tracking-wider text-zinc-500">
										{col.label}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each data.memberBreakdown as member}
								<tr class="border-b border-zinc-800/50 hover:bg-zinc-900/30">
									<td class="px-4 py-3 text-zinc-200">{member.name}</td>
									<td class="px-4 py-3 text-zinc-400">{member.role}</td>
									<td class="px-4 py-3 text-zinc-300">{formatNumber(member.requests)}</td>
									<td class="px-4 py-3 text-zinc-300">{formatNumber(member.inputTokens)}</td>
									<td class="px-4 py-3 text-zinc-300">{formatNumber(member.outputTokens)}</td>
									<td class="px-4 py-3 text-zinc-200">{formatCost(member.cost)}</td>
									<td class="px-4 py-3">
										<button
											class="text-xs text-blue-400 hover:text-blue-300"
											onclick={() => (selectedMember = member)}
										>
											{member.budgetSource ? $t('usage.edit_budget') : $t('usage.set_budget')}
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Budget Defaults Form -->
				<BudgetDefaultsForm
					orgDefault={data.budgets.orgDefault}
					roleBudgets={data.budgets.roleBudgets}
					{orgSlug}
					onSaved={() => invalidateAll()}
				/>
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
			<h2 class="text-lg font-semibold text-zinc-300">{$t('usage.no_data')}</h2>
			<p class="mt-2 max-w-md text-sm text-zinc-500">
				{$t('usage.no_data_hint')}
			</p>
		</div>
	{/if}
</div>

<!-- Budget Panel (slide-out) -->
{#if selectedMember}
	<BudgetPanel
		member={selectedMember}
		{orgSlug}
		onClose={() => (selectedMember = null)}
		onSaved={() => {
			selectedMember = null;
			invalidateAll();
		}}
	/>
{/if}
