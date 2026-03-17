<script lang="ts">
	import { t } from 'svelte-i18n';

	let {
		rpmLimit = $bindable<number | null>(null),
		tpmLimit = $bindable<number | null>(null),
		defaultRpm = null as number | null,
		defaultTpm = null as number | null
	} = $props();
</script>

<div class="space-y-4">
	<div>
		<label for="rpmLimit" class="block text-sm font-medium text-zinc-300">
			{$t('api_keys.rate_limits.rpm')}
		</label>
		<input
			id="rpmLimit"
			type="number"
			name="rpmLimit"
			min="1"
			aria-label="Requests per minute limit"
			placeholder="Inherit org default"
			value={rpmLimit ?? ''}
			oninput={(e) => {
				const v = (e.target as HTMLInputElement).value;
				rpmLimit = v ? parseInt(v, 10) : null;
			}}
			class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
		/>
		<p class="mt-1 text-xs text-zinc-500">
			{#if defaultRpm !== null}
				Org default: {defaultRpm} RPM
			{:else}
				No org default set
			{/if}
			&mdash; Leave empty to inherit org default.
		</p>
	</div>

	<div>
		<label for="tpmLimit" class="block text-sm font-medium text-zinc-300">
			{$t('api_keys.rate_limits.tpm')}
		</label>
		<input
			id="tpmLimit"
			type="number"
			name="tpmLimit"
			min="1"
			aria-label="Tokens per minute limit"
			placeholder="Inherit org default"
			value={tpmLimit ?? ''}
			oninput={(e) => {
				const v = (e.target as HTMLInputElement).value;
				tpmLimit = v ? parseInt(v, 10) : null;
			}}
			class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
		/>
		<p class="mt-1 text-xs text-zinc-500">
			{#if defaultTpm !== null}
				Org default: {defaultTpm} TPM
			{:else}
				No org default set
			{/if}
			&mdash; Leave empty to inherit org default.
		</p>
	</div>
</div>
