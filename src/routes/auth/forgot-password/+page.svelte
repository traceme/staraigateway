<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Forgot Password - StarAIGateway</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	{#if form?.success}
		<div class="rounded-md bg-emerald-900/50 border border-emerald-800 p-4 text-sm text-emerald-200">
			If an account exists with that email, we've sent a password reset link.
		</div>
		<p class="mt-4 text-center text-sm text-zinc-400">
			<a href="/auth/login" class="text-blue-400 hover:text-blue-300">Back to login</a>
		</p>
	{:else}
		<h2 class="mb-2 text-lg font-medium text-zinc-50">Forgot your password?</h2>
		<p class="mb-6 text-sm text-zinc-400">Enter your email and we'll send you a reset link.</p>

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
				<label for="email" class="block text-sm font-medium text-zinc-300">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					value={form?.email ?? ''}
					class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="you@company.com"
				/>
				{#if form?.errors?.email}
					<p class="mt-1 text-sm text-red-400">{form.errors.email[0]}</p>
				{/if}
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
			>
				{loading ? 'Sending...' : 'Send reset link'}
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-zinc-400">
			<a href="/auth/login" class="text-blue-400 hover:text-blue-300">Back to login</a>
		</p>
	{/if}
</div>
