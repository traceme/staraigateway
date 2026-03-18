<script lang="ts">
	import { t } from 'svelte-i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{$t('auth.verify_email.page_title')}</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
	{#if data.success}
		<div class="mb-4 text-3xl">&#10003;</div>
		<h2 class="mb-2 text-lg font-medium text-zinc-50">{$t('auth.verify_email.success_title')}</h2>
		<p class="mb-6 text-sm text-zinc-400">{$t('auth.verify_email.success_description')}</p>
		<a
			href="/auth/login"
			class="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
		>
			{$t('auth.verify_email.success_cta')}
		</a>
	{:else}
		<div class="mb-4 text-3xl">&#10007;</div>
		<h2 class="mb-2 text-lg font-medium text-zinc-50">{$t('auth.verify_email.fail_title')}</h2>
		<p class="mb-6 text-sm text-red-400">{data.error}</p>
		<a
			href="/auth/signup"
			class="inline-block rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
		>
			{$t('auth.verify_email.fail_cta')}
		</a>
	{/if}
</div>
