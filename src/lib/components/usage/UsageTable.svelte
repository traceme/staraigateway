<script lang="ts">
	type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		format?: (v: any) => string;
	};

	type Props = {
		columns: Column[];
		rows: Array<Record<string, any>>;
	};

	let { columns, rows }: Props = $props();

	// Find first sortable column for default sort
	const defaultSortCol = columns.find((c) => c.sortable)?.key ?? columns[0]?.key ?? '';
	let sortKey = $state(defaultSortCol);
	let sortDir = $state<'asc' | 'desc'>('desc');

	function toggleSort(key: string) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'desc';
		}
	}

	let sortedRows = $derived.by(() => {
		if (!sortKey) return rows;
		return [...rows].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			if (typeof aVal === 'number' && typeof bVal === 'number') {
				return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
			}
			const aStr = String(aVal ?? '');
			const bStr = String(bVal ?? '');
			return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
		});
	});
</script>

<div class="overflow-x-auto rounded-lg border border-zinc-800">
	<table class="w-full">
		<thead>
			<tr class="bg-zinc-900">
				{#each columns as col}
					<th
						class="px-4 py-3 text-left text-xs uppercase tracking-wider text-zinc-500
							{col.sortable ? 'cursor-pointer select-none hover:text-zinc-400' : ''}"
						onclick={() => col.sortable && toggleSort(col.key)}
					>
						{col.label}
						{#if col.sortable && sortKey === col.key}
							<span class="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedRows as row}
				<tr class="border-b border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800/50">
					{#each columns as col}
						<td class="px-4 py-3">
							{col.format ? col.format(row[col.key]) : row[col.key]}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
