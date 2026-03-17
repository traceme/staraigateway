<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from 'svelte-i18n';

	let {
		defaultRpmLimit = null as number | null,
		defaultTpmLimit = null as number | null,
		orgSlug
	} = $props();

	let saving = $state(false);
	let showSuccess = $state(false);

	function handleSubmit() {
		saving = true;
		return async ({ update, result }: { update: () => Promise<void>; result: { type: string } }) => {
			saving = false;
			await update();
			if (result.type === 'success') {
				showSuccess = true;
				setTimeout(() => {
					showSuccess = false;
				}, 3000);
			}
		};
	}
</script>

<form
	method="POST"
	action="/org/{orgSlug}/settings?/saveDefaults"
	use:enhance={handleSubmit}
	class="space-y-6"
>
	<div>
		<h2 class="text-lg font-semibold text-zinc-100">{$t('settings.org_name')}</h2>
		<p class="mt-1 text-sm text-zinc-400">
			Applied to API keys that don't have custom limits.
		</p>
	</div>

	<div class="space-y-4">
		<div>
			<label for="defaultRpmLimit" class="block text-sm font-medium text-zinc-300">
				Default Requests per minute (RPM)
			</label>
			<input
				id="defaultRpmLimit"
				type="number"
				name="defaultRpmLimit"
				min="1"
				aria-label="Default requests per minute"
				placeholder="No default limit"
				value={defaultRpmLimit ?? ''}
				disabled={saving}
				class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
			/>
			<p class="mt-1 text-xs text-zinc-500">Leave empty for no default limit.</p>
		</div>

		<div>
			<label for="defaultTpmLimit" class="block text-sm font-medium text-zinc-300">
				Default Tokens per minute (TPM)
			</label>
			<input
				id="defaultTpmLimit"
				type="number"
				name="defaultTpmLimit"
				min="1"
				aria-label="Default tokens per minute"
				placeholder="No default limit"
				value={defaultTpmLimit ?? ''}
				disabled={saving}
				class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
			/>
			<p class="mt-1 text-xs text-zinc-500">Leave empty for no default limit.</p>
		</div>
	</div>

	<div class="flex items-center gap-4">
		<button
			type="submit"
			disabled={saving}
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{#if saving}
				{$t('common.loading')}
			{:else}
				{$t('settings.save_settings')}
			{/if}
		</button>

		{#if showSuccess}
			<span class="text-sm text-green-400 transition-opacity duration-300">
				Settings saved
			</span>
		{/if}
	</div>
</form>
