<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		cheapModel = null as string | null,
		expensiveModel = null as string | null,
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
	action="/org/{orgSlug}/settings?/saveRouting"
	use:enhance={handleSubmit}
	class="space-y-6"
>
	<div>
		<h2 class="text-lg font-bold text-zinc-100">Smart Routing</h2>
		<p class="mt-1 text-sm text-zinc-400">
			Configure which models are used for simple and complex queries when smart routing is enabled.
		</p>
	</div>

	<div class="space-y-4">
		<div>
			<label for="cheapModel" class="block text-sm font-medium text-zinc-300">
				Cheap model (simple queries)
			</label>
			<input
				id="cheapModel"
				type="text"
				name="cheapModel"
				aria-label="Cheap model for simple queries"
				placeholder="e.g., gpt-4o-mini"
				value={cheapModel ?? ''}
				disabled={saving}
				class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
			/>
			<p class="mt-1 text-xs text-zinc-500">Used for queries under 500 tokens.</p>
		</div>

		<div>
			<label for="expensiveModel" class="block text-sm font-medium text-zinc-300">
				Expensive model (complex queries)
			</label>
			<input
				id="expensiveModel"
				type="text"
				name="expensiveModel"
				aria-label="Expensive model for complex queries"
				placeholder="e.g., gpt-4o"
				value={expensiveModel ?? ''}
				disabled={saving}
				class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
			/>
			<p class="mt-1 text-xs text-zinc-500">Used for queries of 500 tokens or more.</p>
		</div>
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
				Save Routing Settings
			{/if}
		</button>

		{#if showSuccess}
			<span class="text-sm text-green-400 transition-opacity duration-300">
				Settings saved
			</span>
		{/if}
	</div>
</form>
