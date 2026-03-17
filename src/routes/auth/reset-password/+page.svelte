<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Reset Password - StarAIGateway</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	{#if !data.tokenValid}
		<div class="text-center">
			<div class="mb-4 text-3xl">&#10007;</div>
			<h2 class="mb-2 text-lg font-medium text-zinc-50">Invalid link</h2>
			<p class="mb-6 text-sm text-red-400">{data.error}</p>
			<a
				href="/auth/forgot-password"
				class="inline-block rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
			>
				Request new link
			</a>
		</div>
	{:else}
		<h2 class="mb-2 text-lg font-medium text-zinc-50">Set a new password</h2>
		<p class="mb-6 text-sm text-zinc-400">Enter your new password below.</p>

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
			<input type="hidden" name="token" value={data.token} />

			<div>
				<label for="password" class="block text-sm font-medium text-zinc-300">New password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					minlength="8"
					class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="Min. 8 characters"
				/>
				{#if form?.errors?.password}
					<p class="mt-1 text-sm text-red-400">{form.errors.password[0]}</p>
				{/if}
				{#if form?.errors?.token}
					<p class="mt-1 text-sm text-red-400">{form.errors.token[0]}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
			>
				{loading ? 'Resetting...' : 'Reset password'}
			</button>
		</form>
	{/if}
</div>
