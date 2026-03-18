<script>
	import { t } from 'svelte-i18n';
</script>

<section class="bg-gradient-to-b from-blue-900/20 to-zinc-950 pt-24 pb-16">
	<div class="max-w-4xl mx-auto px-6 text-center">
		<h1 class="text-3xl md:text-5xl font-bold text-zinc-50">
			{$t('landing.hero_title')}
		</h1>
		<p class="text-lg text-zinc-300 mt-3">{$t('landing.hero_subtitle')}</p>
		<p class="text-xl text-zinc-400 max-w-2xl mx-auto mt-6">
			{$t('landing.hero_description')}
		</p>
		<a href="/auth/signup" class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg px-8 py-3 mt-8 inline-block">
			{$t('landing.hero_cta')}
		</a>
	</div>
</section>
