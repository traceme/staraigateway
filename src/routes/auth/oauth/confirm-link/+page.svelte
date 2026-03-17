<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Confirm Account Link - LLMTokenHub</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	<h2 class="mb-2 text-lg font-medium text-zinc-50">Confirm Account Link</h2>
	<p class="mb-6 text-sm text-zinc-400">
		An account with your email already exists. Enter your password to link your
		<span class="font-medium text-zinc-300">{data.provider}</span> account.
	</p>

	{#if form?.error}
		<div class="mb-4 rounded-lg border border-red-800/30 bg-red-900/20 p-4 text-sm text-red-400">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
		class="space-y-4"
	>
		<div>
			<label for="password" class="block text-sm font-medium text-zinc-300">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				required
				class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				placeholder="Your existing password"
			/>
		</div>

		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
		>
			{loading ? 'Verifying...' : 'Confirm & Link Account'}
		</button>
	</form>

	<p class="mt-4 text-center text-sm text-zinc-400">
		<a href="/auth/login" class="text-blue-400 hover:text-blue-300">Cancel and return to login</a>
	</p>
</div>
