<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Sign Up - StarAIGateway</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	{#if form?.success}
		<div class="rounded-md bg-emerald-900/50 border border-emerald-800 p-4 text-sm text-emerald-200">
			Check your email to verify your account. You can then log in.
		</div>
	{:else}
		<h2 class="mb-6 text-lg font-medium text-zinc-50">Create your account</h2>

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
				<label for="name" class="block text-sm font-medium text-zinc-300">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					value={form?.name ?? ''}
					class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="Your name"
				/>
				{#if form?.errors?.name}
					<p class="mt-1 text-sm text-red-400">{form.errors.name[0]}</p>
				{/if}
			</div>

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

			<div>
				<label for="password" class="block text-sm font-medium text-zinc-300">Password</label>
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
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
			>
				{loading ? 'Creating account...' : 'Create account'}
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-zinc-400">
			Already have an account?
			<a href="/auth/login" class="text-blue-400 hover:text-blue-300">Log in</a>
		</p>
	{/if}
</div>
