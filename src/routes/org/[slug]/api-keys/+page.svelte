<script lang="ts">
	import { enhance } from '$app/forms';
	import CreateKeyModal from '$lib/components/api-keys/CreateKeyModal.svelte';
	import KeyCreatedModal from '$lib/components/api-keys/KeyCreatedModal.svelte';
	import type { ApiKeyMetadata } from '$lib/server/api-keys';

	let { data } = $props();

	let showCreateModal = $state(false);
	let createdKey = $state<string | null>(null);
	let revokingId = $state<string | null>(null);

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

	{#if data.apiKeys.length === 0}
		<!-- Empty state -->
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
		<!-- Key table -->
		<div class="overflow-hidden rounded-lg border border-zinc-800">
			<table class="w-full">
				<thead>
					<tr class="border-b border-zinc-800 bg-zinc-900/80">
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
							>Name</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
							>Key</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
							>Status</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
							>Created</th
						>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500"
							>Last Used</th
						>
						<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500"
						></th>
					</tr>
				</thead>
				<tbody>
					{#each data.apiKeys as key (key.id)}
						<tr class="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
							<td class="px-4 py-3 text-sm font-medium text-zinc-200">{key.name}</td>
							<td class="px-4 py-3">
								<code class="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
									{maskKey(key.keyPrefix)}
								</code>
							</td>
							<td class="px-4 py-3">
								{#if key.isActive}
									<span
										class="inline-flex rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400"
									>
										Active
									</span>
								{:else}
									<span
										class="inline-flex rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400"
									>
										Revoked
									</span>
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
