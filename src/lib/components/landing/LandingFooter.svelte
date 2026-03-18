<script>
	import { t } from 'svelte-i18n';
</script>

<footer class="border-t border-zinc-800 py-8 px-6">
	<div class="max-w-6xl mx-auto flex items-center justify-between">
		<span class="text-sm text-zinc-500">&copy; {$t('landing.footer_copyright')}</span>
		<div class="flex items-center gap-6">
			<a href="https://github.com/your-org/staraigateway" class="text-sm text-zinc-400 hover:text-zinc-300">{$t('landing.footer_github')}</a>
			<a href="/docs" class="text-sm text-zinc-400 hover:text-zinc-300">{$t('landing.footer_docs')}</a>
			<a href="/docs/integrations" class="text-sm text-zinc-400 hover:text-zinc-300">{$t('landing.footer_integrations')}</a>
		</div>
	</div>
</footer>
