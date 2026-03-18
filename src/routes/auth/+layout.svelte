<script>
	import { t } from 'svelte-i18n';
	import LanguageSwitcher from '$lib/components/layout/LanguageSwitcher.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>StarAIGateway</title>
</svelte:head>

<div class="relative flex min-h-screen items-center justify-center px-4">
	<div class="absolute top-4 right-4">
		<LanguageSwitcher authenticated={false} />
	</div>
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-50">StarAIGateway</h1>
			<p class="mt-1 text-sm text-zinc-400">{$t('landing.tagline')}</p>
		</div>
		{@render children()}
	</div>
</div>
