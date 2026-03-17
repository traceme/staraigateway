<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { t } from 'svelte-i18n';

	interface MemberBudgetInfo {
		userId: string;
		name: string;
		cost: number;
		hardLimitCents?: number | null;
		softLimitCents?: number | null;
		currentSpendCents?: number;
		budgetSource?: 'individual' | 'role' | 'org-default' | null;
	}

	let {
		member,
		orgSlug,
		onClose,
		onSaved
	}: {
		member: MemberBudgetInfo;
		orgSlug: string;
		onClose: () => void;
		onSaved: () => void;
	} = $props();

	let hardLimit = $state(
		member.hardLimitCents != null ? member.hardLimitCents / 100 : (null as number | null)
	);
	let softLimit = $state(
		member.softLimitCents != null ? member.softLimitCents / 100 : (null as number | null)
	);
	let saving = $state(false);
	let error = $state('');
	let confirmRemove = $state(false);

	const currentSpendDollars = $derived((member.currentSpendCents ?? 0) / 100);
	const limitDollars = $derived(
		member.hardLimitCents != null ? member.hardLimitCents / 100 : null
	);
	const percentage = $derived(
		limitDollars != null && limitDollars > 0
			? Math.min(Math.round((currentSpendDollars / limitDollars) * 100), 100)
			: 0
	);
	const barColor = $derived(percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-blue-600');

	const inheritedInfo = $derived(() => {
		if (member.budgetSource === 'role') {
			const hard = member.hardLimitCents != null ? `$${(member.hardLimitCents / 100).toFixed(0)}` : 'none';
			const soft = member.softLimitCents != null ? `$${(member.softLimitCents / 100).toFixed(0)}` : 'none';
			return `Currently using role default (${hard} hard / ${soft} soft). Set values below to override.`;
		}
		if (member.budgetSource === 'org-default') {
			const hard = member.hardLimitCents != null ? `$${(member.hardLimitCents / 100).toFixed(0)}` : 'none';
			const soft = member.softLimitCents != null ? `$${(member.softLimitCents / 100).toFixed(0)}` : 'none';
			return `Currently using org default (${hard} hard / ${soft} soft). Set values below to override.`;
		}
		return null;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	async function save() {
		saving = true;
		error = '';
		try {
			const res = await fetch(`/org/${orgSlug}/usage/budget`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: member.userId,
					hardLimit: hardLimit,
					softLimit: softLimit
				})
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Could not save budget. Please try again.';
				return;
			}
			await invalidateAll();
			onSaved();
		} catch {
			error = 'Could not save budget. Please try again.';
		} finally {
			saving = false;
		}
	}

	async function removeBudget() {
		saving = true;
		error = '';
		try {
			const res = await fetch(`/org/${orgSlug}/usage/budget`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: member.userId })
			});
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Could not remove budget.';
				return;
			}
			await invalidateAll();
			onSaved();
		} catch {
			error = 'Could not remove budget.';
		} finally {
			saving = false;
			confirmRemove = false;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-black/50"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
></div>

<!-- Panel -->
<div
	class="fixed top-0 right-0 z-50 h-full w-[400px] border-l border-zinc-800 bg-zinc-900 transition-transform duration-200 ease-out"
	role="dialog"
	aria-label="Budget configuration"
>
	<div class="flex h-full flex-col overflow-y-auto p-6">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-zinc-50">{$t('budget.title')}: {member.name}</h2>
			<button
				class="rounded p-1 text-zinc-400 hover:text-zinc-200"
				aria-label="Close"
				onclick={onClose}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
		</div>

		<!-- Inherited info -->
		{#if inheritedInfo()}
			<p class="mb-4 rounded-md bg-zinc-800 p-3 text-xs text-zinc-400">
				{inheritedInfo()}
			</p>
		{/if}

		<!-- Hard Limit -->
		<label class="mb-1 block text-sm font-medium text-zinc-300">{$t('budget.hard_limit')}</label>
		<div class="mb-1 flex items-center rounded-md border border-zinc-700 bg-zinc-800">
			<span class="px-3 text-sm text-zinc-500">$</span>
			<input
				type="number"
				step="1"
				min="1"
				class="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none"
				placeholder="No limit"
				bind:value={hardLimit}
			/>
		</div>
		<p class="mb-4 text-xs text-zinc-500">Requests rejected when exceeded</p>

		<!-- Soft Limit -->
		<label class="mb-1 block text-sm font-medium text-zinc-300">{$t('budget.soft_limit')}</label>
		<div class="mb-1 flex items-center rounded-md border border-zinc-700 bg-zinc-800">
			<span class="px-3 text-sm text-zinc-500">$</span>
			<input
				type="number"
				step="1"
				min="1"
				class="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none"
				placeholder="No limit"
				bind:value={softLimit}
			/>
		</div>
		<p class="mb-4 text-xs text-zinc-500">Notification sent when exceeded</p>

		<!-- Progress bar -->
		{#if limitDollars != null && limitDollars > 0}
			<div class="mb-4">
				<p class="mb-1 text-sm text-zinc-300">
					{$t('budget.spend_label')}: ${currentSpendDollars.toFixed(2)} / ${limitDollars.toFixed(2)}
				</p>
				<div class="h-2 w-full rounded-full bg-zinc-700">
					<div class="h-2 rounded-full {barColor}" style="width: {percentage}%"></div>
				</div>
				<p class="mt-1 text-xs text-zinc-500">{percentage}%</p>
			</div>
		{/if}

		<!-- Error -->
		{#if error}
			<p class="mb-4 text-sm text-red-400">{error}</p>
		{/if}

		<!-- Save -->
		<button
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
			onclick={save}
			disabled={saving}
		>
			{saving ? $t('common.loading') : $t('common.save')}
		</button>

		<!-- Remove -->
		{#if member.budgetSource === 'individual'}
			<div class="mt-3 text-center">
				{#if !confirmRemove}
					<button
						class="text-sm text-red-400 hover:text-red-300"
						onclick={() => (confirmRemove = true)}
					>
						{$t('common.delete')}
					</button>
				{:else}
					<p class="mb-2 text-xs text-zinc-400">
						This will remove all spend limits for this member. Are you sure?
					</p>
					<div class="flex justify-center gap-2">
						<button
							class="text-sm text-red-400 hover:text-red-300"
							onclick={removeBudget}
							disabled={saving}
						>
							{$t('common.confirm')}
						</button>
						<button
							class="text-sm text-zinc-400 hover:text-zinc-300"
							onclick={() => (confirmRemove = false)}
						>
							{$t('common.cancel')}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
