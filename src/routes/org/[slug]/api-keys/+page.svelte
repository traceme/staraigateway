<script lang="ts">
	import { enhance } from '$app/forms';
	import CreateKeyModal from '$lib/components/api-keys/CreateKeyModal.svelte';
	import KeyCreatedModal from '$lib/components/api-keys/KeyCreatedModal.svelte';
	import type { ApiKeyMetadata } from '$lib/server/api-keys';

	let { data } = $props();

	let showCreateModal = $state(false);
	let createdKey = $state<string | null>(null);
	let revokingId = $state<string | null>(null);
	let activeTab = $state<'my' | 'all'>('my');
	let editingRateLimitId = $state<string | null>(null);
	let editRpm = $state<string>('');
	let editTpm = $state<string>('');
	let openMenuId = $state<string | null>(null);

	function handleKeyCreated(fullKey: string) {
		showCreateModal = false;
		createdKey = fullKey;
	}

	function handleCreatedDismissed() {
		createdKey = null;
	}

	function formatDate(date: Date | string | null): string {
		if (!date) return 'Never';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function maskKey(prefix: string): string {
		return `${prefix}...`;
	}

	function formatTpm(value: number | null): string {
		if (value === null) return '\u2014';
		if (value >= 1000) return `${Math.round(value / 1000)}K`;
		return String(value);
	}

	function formatRpm(value: number | null): string {
		if (value === null) return '\u2014';
		return String(value);
	}

	function startEditRateLimit(key: { id: string; rpmLimit: number | null; tpmLimit: number | null }) {
		editingRateLimitId = key.id;
		editRpm = key.rpmLimit !== null ? String(key.rpmLimit) : '';
		editTpm = key.tpmLimit !== null ? String(key.tpmLimit) : '';
		openMenuId = null;
	}
</script>

<svelte:head>
	<title>API Keys - LLMTokenHub</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-zinc-100">API Keys</h1>
			<p class="mt-1 text-sm text-zinc-500">
				Personal API keys for accessing LLM models through Cursor, Continue.dev, Claude Code, and
				other tools.
			</p>
		</div>
		<button
			onclick={() => (showCreateModal = true)}
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Create API Key
		</button>
	</div>

	{#if data.isAdmin}
		<!-- Tab toggle for admin -->
		<div class="mb-6 border-b border-zinc-800" role="tablist">
			<button
				role="tab"
				aria-selected={activeTab === 'my'}
				onclick={() => (activeTab = 'my')}
				class="mr-4 pb-2 text-sm font-medium {activeTab === 'my'
					? 'border-b-2 border-blue-500 text-blue-400'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				My Keys
			</button>
			<button
				role="tab"
				aria-selected={activeTab === 'all'}
				onclick={() => (activeTab = 'all')}
				class="pb-2 text-sm font-medium {activeTab === 'all'
					? 'border-b-2 border-blue-500 text-blue-400'
					: 'text-zinc-400 hover:text-zinc-200'}"
			>
				All Keys
			</button>
		</div>
	{/if}

	{#if activeTab === 'my'}
		<!-- My Keys tab (existing behavior) -->
		{#if data.myKeys.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 py-16"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-zinc-600"
				>
					<polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
				</svg>
				<h3 class="mt-4 text-sm font-medium text-zinc-300">No API keys yet</h3>
				<p class="mt-1 text-sm text-zinc-500">Create one to get started.</p>
				<button
					onclick={() => (showCreateModal = true)}
					class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					Create API Key
				</button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg border border-zinc-800">
				<table class="w-full">
					<thead>
						<tr class="border-b border-zinc-800 bg-zinc-900/80">
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Key</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Created</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Last Used</th>
							<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.myKeys as key (key.id)}
							<tr class="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
								<td class="px-4 py-3 text-sm font-medium text-zinc-200">{key.name}</td>
								<td class="px-4 py-3">
									<code class="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
										{maskKey(key.keyPrefix)}
									</code>
								</td>
								<td class="px-4 py-3">
									{#if key.isActive}
										<span class="inline-flex rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">Active</span>
									{:else}
										<span class="inline-flex rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400">Revoked</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-zinc-400">{formatDate(key.createdAt)}</td>
								<td class="px-4 py-3 text-sm text-zinc-400">{formatDate(key.lastUsedAt)}</td>
								<td class="px-4 py-3 text-right">
									{#if key.isActive}
										<form
											method="POST"
											action="/org/{data.currentOrg.slug}/api-keys?/revoke"
											use:enhance={() => {
												revokingId = key.id;
												return async ({ update }) => {
													revokingId = null;
													await update();
												};
											}}
										>
											<input type="hidden" name="id" value={key.id} />
											<button
												type="submit"
												disabled={revokingId === key.id}
												onclick={(e) => {
													if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
														e.preventDefault();
													}
												}}
												class="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
											>
												{revokingId === key.id ? 'Revoking...' : 'Revoke'}
											</button>
										</form>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{:else}
		<!-- All Keys tab (admin only) -->
		{#if data.allKeys.length === 0}
			<div class="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 py-16">
				<h3 class="text-sm font-medium text-zinc-300">No API keys in this organization</h3>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg border border-zinc-800">
				<table class="w-full">
					<thead>
						<tr class="border-b border-zinc-800 bg-zinc-900/80">
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Owner</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Key</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">RPM</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">TPM</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Last Used</th>
							<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.allKeys as key (key.id)}
							<tr class="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 {key.isActive ? '' : 'text-zinc-400'}">
								<td class="px-4 py-3 text-sm font-medium {key.isActive ? 'text-zinc-200' : 'text-zinc-500'}">{key.name}</td>
								<td class="px-4 py-3 text-sm {key.isActive ? 'text-zinc-300' : 'text-zinc-500'}">{key.ownerName}</td>
								<td class="px-4 py-3">
									<code class="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
										{maskKey(key.keyPrefix)}
									</code>
								</td>
								<td class="px-4 py-3">
									{#if key.isActive}
										<span class="inline-flex rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">Active</span>
									{:else}
										<span class="inline-flex rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400">Revoked</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-zinc-400">{formatRpm(key.rpmLimit)}</td>
								<td class="px-4 py-3 text-sm text-zinc-400">{formatTpm(key.tpmLimit)}</td>
								<td class="px-4 py-3 text-sm text-zinc-400">{formatDate(key.lastUsedAt)}</td>
								<td class="px-4 py-3 text-right">
									{#if key.isActive}
										{#if editingRateLimitId === key.id}
											<!-- Inline rate limit edit form -->
											<form
												method="POST"
												action="/org/{data.currentOrg.slug}/api-keys?/updateRateLimits"
												use:enhance={() => {
													return async ({ update }) => {
														editingRateLimitId = null;
														await update();
													};
												}}
												class="flex items-center gap-2"
											>
												<input type="hidden" name="id" value={key.id} />
												<input
													type="number"
													name="rpmLimit"
													min="1"
													placeholder="RPM"
													value={editRpm}
													class="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
												/>
												<input
													type="number"
													name="tpmLimit"
													min="1"
													placeholder="TPM"
													value={editTpm}
													class="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
												/>
												<button type="submit" class="text-xs font-medium text-blue-400 hover:text-blue-300">Save</button>
												<button type="button" onclick={() => (editingRateLimitId = null)} class="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
											</form>
										{:else}
											<!-- Three-dot menu -->
											<div class="relative">
												<button
													onclick={() => (openMenuId = openMenuId === key.id ? null : key.id)}
													class="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
													aria-label="Key actions"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
														<circle cx="12" cy="5" r="2" />
														<circle cx="12" cy="12" r="2" />
														<circle cx="12" cy="19" r="2" />
													</svg>
												</button>
												{#if openMenuId === key.id}
													<div class="absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
														<button
															onclick={() => startEditRateLimit(key)}
															class="block w-full px-4 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-700"
														>
															Edit Rate Limits
														</button>
														<form
															method="POST"
															action="/org/{data.currentOrg.slug}/api-keys?/adminRevoke"
															use:enhance={() => {
																openMenuId = null;
																revokingId = key.id;
																return async ({ update }) => {
																	revokingId = null;
																	await update();
																};
															}}
														>
															<input type="hidden" name="id" value={key.id} />
															<button
																type="submit"
																onclick={(e) => {
																	if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
																		e.preventDefault();
																		openMenuId = null;
																	}
																}}
																class="block w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-zinc-700"
															>
																Revoke
															</button>
														</form>
													</div>
												{/if}
											</div>
										{/if}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<!-- Create key modal -->
{#if showCreateModal}
	<CreateKeyModal
		orgSlug={data.currentOrg.slug}
		onclose={() => (showCreateModal = false)}
		oncreated={handleKeyCreated}
	/>
{/if}

<!-- Show-once key modal -->
{#if createdKey}
	<KeyCreatedModal fullKey={createdKey} onclose={handleCreatedDismissed} />
{/if}
