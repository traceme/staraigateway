<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { t } from 'svelte-i18n';
	import OAuthButtons from '$lib/components/auth/OAuthButtons.svelte';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let loading = $state(false);

	const oauthError = $derived($page.url.searchParams.get('error') === 'oauth_failed');
</script>

<svelte:head>
	<title>{$t('auth.login.page_title')}</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	<h2 class="mb-6 text-lg font-medium text-zinc-50">{$t('auth.login.title')}</h2>

	{#if oauthError}
		<div class="mb-4 rounded-lg border border-red-800/30 bg-red-900/20 p-4 text-sm text-red-400">
			{$t('auth.login.oauth_error')}
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
			<div class="flex items-center justify-between">
				<label for="password" class="block text-sm font-medium text-zinc-300">{$t('auth.password_label')}</label>
				<a href="/auth/forgot-password" class="text-xs text-zinc-400 hover:text-zinc-300">{$t('auth.login.forgot_password')}</a>
			</div>
			<input
				id="password"
				name="password"
				type="password"
				required
				class="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				placeholder="Your password"
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
			{loading ? $t('auth.login.loading') : $t('auth.login.submit')}
		</button>
	</form>

	<OAuthButtons googleEnabled={data.googleEnabled} githubEnabled={data.githubEnabled} />

	<p class="mt-4 text-center text-sm text-zinc-400">
		{$t('auth.login.no_account')}
		<a href="/auth/signup" class="text-blue-400 hover:text-blue-300">{$t('auth.login.signup_link')}</a>
	</p>
</div>
