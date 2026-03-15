<script lang="ts">
	import type { ProviderDef } from '$lib/server/providers';
	import { enhance } from '$app/forms';

	type KeyInfo = {
		id: string;
		provider: string;
		label: string;
		baseUrl: string | null;
		models: string | null;
		isActive: boolean;
		createdAt: Date;
		updatedAt: Date;
	};

	type Props = {
		provider: ProviderDef;
		existingKeys: KeyInfo[];
		orgSlug: string;
		onclose: () => void;
	};

	let { provider, existingKeys, orgSlug, onclose }: Props = $props();

	let label = $state('');
	let apiKey = $state('');
	let baseUrl = $state('');
	let validating = $state(false);
	let validationResult = $state<{ valid: boolean; models: string[]; error?: string } | null>(null);
	let saving = $state(false);
	let deleteConfirmId = $state<string | null>(null);
	let formError = $state('');

	async function handleValidate() {
		if (!apiKey.trim()) return;
		validating = true;
		validationResult = null;

		try {
			const res = await fetch(`/org/${orgSlug}/provider-keys/validate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: provider.id,
					apiKey: apiKey.trim(),
					baseUrl: provider.id === 'custom' ? baseUrl.trim() : undefined
				})
			});
			validationResult = await res.json();
		} catch {
			validationResult = { valid: false, models: [], error: 'Network error' };
		} finally {
			validating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function resetForm() {
		label = '';
		apiKey = '';
		baseUrl = '';
		validationResult = null;
		formError = '';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Overlay -->
<div
	class="fixed inset-0 z-40 bg-black/60 transition-opacity"
	role="button"
	tabindex="-1"
	onclick={onclose}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
></div>

<!-- Panel -->
<div
	class="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto bg-zinc-900 shadow-xl"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-zinc-800 p-4">
		<div>
			<h2 class="text-lg font-semibold text-zinc-100">{provider.name}</h2>
			{#if provider.docsUrl}
				<a
					href={provider.docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs text-blue-400 hover:text-blue-300"
				>
					Get API key &rarr;
				</a>
			{/if}
		</div>
		<button
			type="button"
			class="rounded-md p-1 text-zinc-400 hover:text-zinc-200"
			onclick={onclose}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
		</button>
	</div>

	<!-- Add new key form -->
	<div class="border-b border-zinc-800 p-4">
		<h3 class="mb-3 text-sm font-medium text-zinc-300">Add New Key</h3>
		<form
			method="POST"
			action="/org/{orgSlug}/provider-keys?/create"
			use:enhance={() => {
				saving = true;
				formError = '';
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success') {
						resetForm();
						await update();
					} else if (result.type === 'failure' && result.data) {
						formError = (result.data as { error?: string }).error ?? 'Failed to save key';
					}
				};
			}}
			class="space-y-3"
		>
			<input type="hidden" name="provider" value={provider.id} />

			<div>
				<label for="label" class="mb-1 block text-xs text-zinc-400">Label</label>
				<input
					id="label"
					name="label"
					type="text"
					bind:value={label}
					placeholder="e.g., Production, Dev team"
					class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
					required
				/>
			</div>

			<div>
				<label for="apiKey" class="mb-1 block text-xs text-zinc-400">API Key</label>
				<textarea
					id="apiKey"
					name="apiKey"
					bind:value={apiKey}
					placeholder="sk-..."
					rows="2"
					class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
					required
				></textarea>
			</div>

			{#if provider.id === 'custom' || provider.id === 'azure'}
				<div>
					<label for="baseUrl" class="mb-1 block text-xs text-zinc-400">Base URL</label>
					<input
						id="baseUrl"
						name="baseUrl"
						type="url"
						bind:value={baseUrl}
						placeholder="https://your-endpoint.com"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
					/>
				</div>
			{/if}

			<!-- Validation result -->
			{#if validationResult}
				<div
					class="rounded-md p-2 text-sm {validationResult.valid
						? 'border border-green-800 bg-green-900/30 text-green-400'
						: 'border border-red-800 bg-red-900/30 text-red-400'}"
				>
					{#if validationResult.valid}
						<span>Valid -- {validationResult.models.length} models discovered</span>
					{:else}
						<span>Invalid: {validationResult.error}</span>
					{/if}
				</div>
			{/if}

			{#if formError}
				<div class="rounded-md border border-red-800 bg-red-900/30 p-2 text-sm text-red-400">
					{formError}
				</div>
			{/if}

			<div class="flex gap-2">
				<button
					type="button"
					onclick={handleValidate}
					disabled={validating || !apiKey.trim()}
					class="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{validating ? 'Validating...' : 'Validate'}
				</button>
				<button
					type="submit"
					disabled={saving || !label.trim() || !apiKey.trim()}
					class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save Key'}
				</button>
			</div>
		</form>
	</div>

	<!-- Existing keys -->
	<div class="flex-1 p-4">
		<h3 class="mb-3 text-sm font-medium text-zinc-300">
			Existing Keys ({existingKeys.length})
		</h3>

		{#if existingKeys.length === 0}
			<p class="text-sm text-zinc-600">No keys configured for this provider.</p>
		{:else}
			<div class="space-y-2">
				{#each existingKeys as key (key.id)}
					<div class="rounded-md border border-zinc-700 bg-zinc-800/50 p-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-zinc-200">{key.label}</span>
								<span
									class="rounded-full px-2 py-0.5 text-xs {key.isActive
										? 'bg-green-900/40 text-green-400'
										: 'bg-zinc-700 text-zinc-500'}"
								>
									{key.isActive ? 'Active' : 'Inactive'}
								</span>
							</div>
							<div class="flex items-center gap-1">
								<!-- Toggle active -->
								<form
									method="POST"
									action="/org/{orgSlug}/provider-keys?/update"
									use:enhance
								>
									<input type="hidden" name="id" value={key.id} />
									<input type="hidden" name="isActive" value={String(!key.isActive)} />
									<button
										type="submit"
										class="rounded p-1 text-xs text-zinc-400 hover:text-zinc-200"
										title={key.isActive ? 'Deactivate' : 'Activate'}
									>
										{key.isActive ? 'Disable' : 'Enable'}
									</button>
								</form>

								<!-- Delete -->
								{#if deleteConfirmId === key.id}
									<form
										method="POST"
										action="/org/{orgSlug}/provider-keys?/delete"
										use:enhance
									>
										<input type="hidden" name="id" value={key.id} />
										<button
											type="submit"
											class="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-500"
										>
											Confirm
										</button>
									</form>
									<button
										type="button"
										class="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
										onclick={() => (deleteConfirmId = null)}
									>
										Cancel
									</button>
								{:else}
									<button
										type="button"
										class="rounded p-1 text-xs text-zinc-500 hover:text-red-400"
										onclick={() => (deleteConfirmId = key.id)}
									>
										Delete
									</button>
								{/if}
							</div>
						</div>
						{#if key.models}
							{@const modelList = JSON.parse(key.models) as string[]}
							<p class="mt-1 text-xs text-zinc-500">
								{modelList.length} models available
							</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
