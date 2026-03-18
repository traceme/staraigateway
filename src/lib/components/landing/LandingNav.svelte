<script>
	import { t } from 'svelte-i18n';
	import LanguageSwitcher from '$lib/components/layout/LanguageSwitcher.svelte';
</script>

<nav aria-label="Main navigation" class="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
	<div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
		<a href="/" class="text-lg font-bold text-zinc-50">StarAIGateway</a>
		<div class="flex items-center gap-4">
			<LanguageSwitcher authenticated={false} />
			<a href="/auth/login" class="text-zinc-400 hover:text-zinc-100 text-sm">{$t('landing.nav_login')}</a>
			<a href="/auth/signup" class="bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg px-4 py-2">{$t('landing.nav_get_started')}</a>
		</div>
	</div>
</nav>
