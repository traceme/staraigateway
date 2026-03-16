<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	interface BudgetDefault {
		hardLimitCents?: number | null;
		softLimitCents?: number | null;
		resetDay?: number;
	}

	interface RoleBudget {
		role: string;
		hardLimitCents?: number | null;
		softLimitCents?: number | null;
	}

	let {
		orgDefault,
		roleBudgets,
		orgSlug,
		onSaved
	}: {
		orgDefault: BudgetDefault | null;
		roleBudgets: RoleBudget[];
		orgSlug: string;
		onSaved: () => void;
	} = $props();

	// Org-wide default state
	let orgHardLimit = $state(
		orgDefault?.hardLimitCents != null ? orgDefault.hardLimitCents / 100 : (null as number | null)
	);
	let orgSoftLimit = $state(
		orgDefault?.softLimitCents != null ? orgDefault.softLimitCents / 100 : (null as number | null)
	);
	let resetDay = $state(orgDefault?.resetDay ?? 1);
	let orgSaving = $state(false);
	let orgError = $state('');
	let orgSuccess = $state('');

	// Per-role state
	const roles = ['member', 'admin', 'owner'] as const;

	function getRoleBudget(role: string): RoleBudget | undefined {
		return roleBudgets.find((rb) => rb.role === role);
	}

	let roleHardLimits = $state<Record<string, number | null>>({
		member: getRoleBudget('member')?.hardLimitCents != null ? getRoleBudget('member')!.hardLimitCents! / 100 : null,
		admin: getRoleBudget('admin')?.hardLimitCents != null ? getRoleBudget('admin')!.hardLimitCents! / 100 : null,
		owner: getRoleBudget('owner')?.hardLimitCents != null ? getRoleBudget('owner')!.hardLimitCents! / 100 : null
	});

	let roleSoftLimits = $state<Record<string, number | null>>({
		member: getRoleBudget('member')?.softLimitCents != null ? getRoleBudget('member')!.softLimitCents! / 100 : null,
		admin: getRoleBudget('admin')?.softLimitCents != null ? getRoleBudget('admin')!.softLimitCents! / 100 : null,
		owner: getRoleBudget('owner')?.softLimitCents != null ? getRoleBudget('owner')!.softLimitCents! / 100 : null
	});

	let roleSaving = $state<Record<string, boolean>>({ member: false, admin: false, owner: false });
	let roleError = $state<Record<string, string>>({ member: '', admin: '', owner: '' });
	let roleSuccess = $state<Record<string, string>>({ member: '', admin: '', owner: '' });
	let expandedRoles = $state<Record<string, boolean>>({ member: true, admin: false, owner: false });

	async function saveOrgDefault() {
		orgSaving = true;
		orgError = '';
		orgSuccess = '';
		try {
			const res = await fetch(`/org/${orgSlug}/usage/budget`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					isOrgDefault: true,
					hardLimit: orgHardLimit,
					softLimit: orgSoftLimit,
					resetDay
				})
			});
			const data = await res.json();
			if (!res.ok) {
				orgError = data.error || 'Could not save defaults.';
				return;
			}
			orgSuccess = 'Saved';
			await invalidateAll();
			onSaved();
			setTimeout(() => (orgSuccess = ''), 2000);
		} catch {
			orgError = 'Could not save defaults.';
		} finally {
			orgSaving = false;
		}
	}

	async function saveRoleDefault(role: string) {
		roleSaving[role] = true;
		roleError[role] = '';
		roleSuccess[role] = '';
		try {
			const res = await fetch(`/org/${orgSlug}/usage/budget`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					role,
					hardLimit: roleHardLimits[role],
					softLimit: roleSoftLimits[role]
				})
			});
			const data = await res.json();
			if (!res.ok) {
				roleError[role] = data.error || 'Could not save role default.';
				return;
			}
			roleSuccess[role] = 'Saved';
			await invalidateAll();
			onSaved();
			setTimeout(() => (roleSuccess[role] = ''), 2000);
		} catch {
			roleError[role] = 'Could not save role default.';
		} finally {
			roleSaving[role] = false;
		}
	}

	async function removeRoleDefault(role: string) {
		roleSaving[role] = true;
		roleError[role] = '';
		try {
			const res = await fetch(`/org/${orgSlug}/usage/budget`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});
			if (!res.ok) {
				const data = await res.json();
				roleError[role] = data.error || 'Could not remove role default.';
				return;
			}
			roleHardLimits[role] = null;
			roleSoftLimits[role] = null;
			await invalidateAll();
			onSaved();
		} catch {
			roleError[role] = 'Could not remove role default.';
		} finally {
			roleSaving[role] = false;
		}
	}

	function roleLabel(role: string): string {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}
</script>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	<!-- Section 1: Org-Wide Default -->
	<h3 class="text-base font-semibold text-zinc-50">Org-Wide Default</h3>
	<p class="mb-4 text-xs text-zinc-500">Applies to members without an individual or role budget</p>

	<div class="space-y-3">
		<div>
			<label class="mb-1 block text-sm text-zinc-300">Hard Limit ($)</label>
			<div class="flex items-center rounded-md border border-zinc-700 bg-zinc-800">
				<span class="px-3 text-sm text-zinc-500">$</span>
				<input
					type="number"
					step="1"
					min="1"
					class="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none"
					placeholder="No limit set"
					bind:value={orgHardLimit}
				/>
			</div>
		</div>
		<div>
			<label class="mb-1 block text-sm text-zinc-300">Soft Limit ($)</label>
			<div class="flex items-center rounded-md border border-zinc-700 bg-zinc-800">
				<span class="px-3 text-sm text-zinc-500">$</span>
				<input
					type="number"
					step="1"
					min="1"
					class="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none"
					placeholder="No limit set"
					bind:value={orgSoftLimit}
				/>
			</div>
		</div>
		<div>
			<label class="mb-1 block text-sm text-zinc-300">Budget Reset Day</label>
			<select
				class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none"
				bind:value={resetDay}
			>
				{#each Array.from({ length: 28 }, (_, i) => i + 1) as day}
					<option value={day}>{day}</option>
				{/each}
			</select>
			<p class="mt-1 text-xs text-zinc-500">Budgets reset on the {resetDay}{resetDay === 1 ? 'st' : resetDay === 2 ? 'nd' : resetDay === 3 ? 'rd' : 'th'} of each month</p>
		</div>
	</div>

	{#if orgError}
		<p class="mt-2 text-sm text-red-400">{orgError}</p>
	{/if}
	{#if orgSuccess}
		<p class="mt-2 text-sm text-green-400">{orgSuccess}</p>
	{/if}

	<button
		class="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		onclick={saveOrgDefault}
		disabled={orgSaving}
	>
		{orgSaving ? 'Saving...' : 'Save Org Default'}
	</button>

	<!-- Section 2: Per-Role Defaults -->
	<div class="mt-6 border-t border-zinc-800 pt-6">
		<h3 class="text-base font-semibold text-zinc-50">Role Defaults</h3>
		<p class="mb-4 text-xs text-zinc-500">Override the org default for specific roles. Cascade: individual &gt; role &gt; org default.</p>

		{#each roles as role}
			{@const hasExisting = getRoleBudget(role) != null}
			<div class="mb-4 rounded-md border border-zinc-800 bg-zinc-950/50">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-200 hover:text-zinc-100"
					onclick={() => (expandedRoles[role] = !expandedRoles[role])}
				>
					<span>{roleLabel(role)} Role Default</span>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="transition-transform {expandedRoles[role] ? 'rotate-180' : ''}"
					>
						<path d="M4 6l4 4 4-4" />
					</svg>
				</button>

				{#if expandedRoles[role]}
					<div class="space-y-3 border-t border-zinc-800 px-4 pb-4 pt-3">
						<div>
							<label class="mb-1 block text-sm text-zinc-300">Hard Limit ($)</label>
							<div class="flex items-center rounded-md border border-zinc-700 bg-zinc-800">
								<span class="px-3 text-sm text-zinc-500">$</span>
								<input
									type="number"
									step="1"
									min="1"
									class="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none"
									placeholder="No limit set"
									bind:value={roleHardLimits[role]}
								/>
							</div>
						</div>
						<div>
							<label class="mb-1 block text-sm text-zinc-300">Soft Limit ($)</label>
							<div class="flex items-center rounded-md border border-zinc-700 bg-zinc-800">
								<span class="px-3 text-sm text-zinc-500">$</span>
								<input
									type="number"
									step="1"
									min="1"
									class="w-full bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none"
									placeholder="No limit set"
									bind:value={roleSoftLimits[role]}
								/>
							</div>
						</div>

						{#if roleError[role]}
							<p class="text-sm text-red-400">{roleError[role]}</p>
						{/if}
						{#if roleSuccess[role]}
							<p class="text-sm text-green-400">{roleSuccess[role]}</p>
						{/if}

						<button
							class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
							onclick={() => saveRoleDefault(role)}
							disabled={roleSaving[role]}
						>
							{roleSaving[role] ? 'Saving...' : `Save ${roleLabel(role)} Default`}
						</button>

						{#if hasExisting}
							<button
								class="w-full text-sm text-red-400 hover:text-red-300"
								onclick={() => removeRoleDefault(role)}
								disabled={roleSaving[role]}
							>
								Remove {roleLabel(role)} Default
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
