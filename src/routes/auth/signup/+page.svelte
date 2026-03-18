<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from 'svelte-i18n';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>{$t('auth.signup.page_title')}</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	{#if form?.success}
		<div class="rounded-md bg-emerald-900/50 border border-emerald-800 p-4 text-sm text-emerald-200">
			{$t('auth.signup.success')}
		</div>
	{:else}
		<h2 class="mb-6 text-lg font-medium text-zinc-50">{$t('auth.signup.title')}</h2>

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
				<label for="name" class="block text-sm font-medium text-zinc-300">{$t('auth.name_label')}</label>
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
				<label for="email" class="block text-sm font-medium text-zinc-300">{$t('auth.email_label')}</label>
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
				<label for="password" class="block text-sm font-medium text-zinc-300">{$t('auth.password_label')}</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					minlength="8"
					class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder={$t('auth.signup.password_placeholder')}
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
				{loading ? $t('auth.signup.loading') : $t('auth.signup.submit')}
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-zinc-400">
			{$t('auth.signup.has_account')}
			<a href="/auth/login" class="text-blue-400 hover:text-blue-300">{$t('auth.signup.login_link')}</a>
		</p>
	{/if}
</div>
