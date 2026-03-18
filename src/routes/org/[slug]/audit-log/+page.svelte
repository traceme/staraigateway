<script lang="ts">
	import { t, locale } from 'svelte-i18n';
	import { page } from '$app/stores';

	let { data } = $props();

	const actionTypeKeys = [
		'member_invited',
		'member_removed',
		'role_changed',
		'api_key_created',
		'api_key_revoked',
		'provider_key_added',
		'provider_key_removed',
		'budget_changed',
		'settings_updated'
	];

	function formatTimestamp(iso: string): string {
		const d = new Date(iso);
		return (
			d.toLocaleDateString($locale ?? 'en', { month: 'short', day: 'numeric', year: 'numeric' }) +
			' ' +
			d.toLocaleTimeString($locale ?? 'en', { hour: '2-digit', minute: '2-digit' })
		);
	}

	function formatTarget(targetType: string, targetId: string | null): string {
		if (targetId) return `${targetType}: ${targetId}`;
		return targetType;
	}

	function formatDetails(metadata: Record<string, unknown> | null): string {
		if (!metadata) return '';
		return Object.entries(metadata)
			.map(([k, v]) => `${k}=${v}`)
			.join(', ');
	}

	function buildFilterUrl(params: Record<string, string | string[]>): string {
		const base = $page.url.pathname;
		const sp = new URLSearchParams();
		for (const [key, val] of Object.entries(params)) {
			if (Array.isArray(val)) {
				for (const v of val) sp.append(key, v);
			} else if (val) {
				sp.set(key, val);
			}
		}
		const qs = sp.toString();
		return qs ? `${base}?${qs}` : base;
	}

	let newerUrl = $derived(
		buildFilterUrl({
			action: data.filters.actionTypes,
			start: data.filters.startDate,
			end: data.filters.endDate
		})
	);

	let olderUrl = $derived(
		data.nextCursor
			? buildFilterUrl({
					action: data.filters.actionTypes,
					start: data.filters.startDate,
					end: data.filters.endDate,
					cursor: data.nextCursor
				})
			: ''
	);

	let hasCursor = $derived(!!$page.url.searchParams.get('cursor'));
</script>

<svelte:head>
	<title>{$t('audit.title')} - StarAIGateway</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-zinc-100">{$t('audit.title')}</h1>
	</div>

	<!-- Filters -->
	<form method="GET" class="mb-6 flex flex-wrap items-end gap-4">
		<div>
			<label for="action-filter" class="mb-1 block text-xs font-medium text-zinc-400">
				{$t('audit.filter.action_type')}
			</label>
			<select
				id="action-filter"
				name="action"
				multiple
				class="h-24 w-48 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
			>
				{#each actionTypeKeys as key}
					<option value={key} selected={data.filters.actionTypes.includes(key)}>
						{$t('audit.actions.' + key)}
					</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="start-date" class="mb-1 block text-xs font-medium text-zinc-400">
				{$t('audit.filter.start_date')}
			</label>
			<input
				id="start-date"
				type="date"
				name="start"
				value={data.filters.startDate}
				class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
			/>
		</div>

		<div>
			<label for="end-date" class="mb-1 block text-xs font-medium text-zinc-400">
				{$t('audit.filter.end_date')}
			</label>
			<input
				id="end-date"
				type="date"
				name="end"
				value={data.filters.endDate}
				class="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
			/>
		</div>

		<button
			type="submit"
			class="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
		>
			{$t('audit.filter.action_type')}
		</button>

		<a
			href={$page.url.pathname}
			class="rounded-md border border-zinc-700 px-4 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
		>
			{$t('audit.filter.clear')}
		</a>
	</form>

	<!-- Table -->
	{#if data.entries.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
			{$t('audit.empty')}
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
			<table class="w-full">
				<thead>
					<tr class="border-b border-zinc-800 bg-zinc-900/80">
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
						>
							{$t('audit.columns.timestamp')}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
						>
							{$t('audit.columns.actor')}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
						>
							{$t('audit.columns.action')}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
						>
							{$t('audit.columns.target')}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
						>
							{$t('audit.columns.details')}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry}
						<tr class="border-b border-zinc-800/50 hover:bg-zinc-800/50">
							<td class="whitespace-nowrap px-4 py-3 text-sm text-zinc-400">
								{formatTimestamp(entry.createdAt)}
							</td>
							<td class="px-4 py-3 text-sm text-zinc-200">
								{entry.actorName}
							</td>
							<td class="px-4 py-3 text-sm text-zinc-200">
								{$t('audit.actions.' + entry.actionType)}
							</td>
							<td class="px-4 py-3 text-sm text-zinc-400">
								{formatTarget(entry.targetType, entry.targetId)}
							</td>
							<td class="max-w-xs truncate px-4 py-3 text-sm text-zinc-500">
								{formatDetails(entry.metadata)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<div class="mt-4 flex justify-between">
			{#if hasCursor}
				<a
					href={newerUrl}
					class="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
				>
					{$t('audit.pagination.newer')}
				</a>
			{:else}
				<span></span>
			{/if}

			{#if data.nextCursor}
				<a
					href={olderUrl}
					class="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
				>
					{$t('audit.pagination.older')}
				</a>
			{/if}
		</div>
	{/if}
</div>
