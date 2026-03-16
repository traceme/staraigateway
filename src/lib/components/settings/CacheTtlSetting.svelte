<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		cacheTtlSeconds = 3600,
		orgSlug,
		redisAvailable = false
	} = $props();

	let saving = $state(false);
	let showSuccess = $state(false);
	let ttlValue = $state(cacheTtlSeconds);
	let validationError = $state('');

	function validate(value: number): string {
		if (isNaN(value) || value < 60 || value > 86400) {
			return 'TTL must be between 60 and 86,400 seconds.';
		}
		return '';
	}

	function handleSubmit() {
		const err = validate(ttlValue);
		if (err) {
			validationError = err;
			saving = false;
			return async () => {};
		}
		saving = true;
		validationError = '';
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
	action="/org/{orgSlug}/settings?/saveCacheTtl"
	use:enhance={handleSubmit}
	class="space-y-6"
>
	<div>
		<h2 class="text-lg font-bold text-zinc-100">Response Caching</h2>
		<p class="mt-1 text-sm text-zinc-400">
			Cache identical non-streaming responses to reduce API calls. Requires Redis.
		</p>
	</div>

	{#if !redisAvailable}
		<div class="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4 text-sm text-zinc-400">
			Response caching requires Redis. Set the REDIS_URL environment variable to enable caching.
		</div>
	{/if}

	<div>
		<label for="cacheTtlSeconds" class="block text-sm font-medium text-zinc-300">
			Cache TTL (seconds)
		</label>
		<input
			id="cacheTtlSeconds"
			type="number"
			name="cacheTtlSeconds"
			min="60"
			max="86400"
			aria-label="Cache time to live in seconds"
			placeholder="3600"
			bind:value={ttlValue}
			disabled={saving}
			class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
		/>
		<p class="mt-1 text-xs text-zinc-500">
			How long cached responses are stored. Default: 3600 seconds (1 hour).
		</p>
		{#if validationError}
			<p class="mt-1 text-xs text-red-400">{validationError}</p>
		{/if}
	</div>

	<div class="flex items-center gap-4">
		<button
			type="submit"
			disabled={saving}
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{#if saving}
				Saving...
			{:else}
				Save Cache Settings
			{/if}
		</button>

		{#if showSuccess}
			<span class="text-sm text-green-400 transition-opacity duration-300">
				Settings saved
			</span>
		{/if}
	</div>
</form>
