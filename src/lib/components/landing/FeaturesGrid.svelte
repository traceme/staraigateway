<script>
	import { t } from 'svelte-i18n';
</script>

<section class="py-16">
	<div class="max-w-6xl mx-auto px-6">
		<h2 class="text-[30px] font-bold text-zinc-50 text-center mb-12">
			{$t('landing.features_heading')}
		</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
			<!-- Bring Your Own Keys -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<svg class="text-blue-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
				</svg>
				<h3 class="text-lg font-bold text-zinc-100 mb-2">{$t('landing.feature_byok_title')}</h3>
				<p class="text-sm text-zinc-400">{$t('landing.feature_byok_desc')}</p>
			</div>

			<!-- Budget Controls -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<svg class="text-blue-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
				<h3 class="text-lg font-bold text-zinc-100 mb-2">{$t('landing.feature_budget_title')}</h3>
				<p class="text-sm text-zinc-400">{$t('landing.feature_budget_desc')}</p>
			</div>

			<!-- Smart Routing -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<svg class="text-blue-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M16 3h5v5" />
					<path d="M8 3H3v5" />
					<path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
					<path d="m15 9 6-6" />
				</svg>
				<h3 class="text-lg font-bold text-zinc-100 mb-2">{$t('landing.feature_routing_title')}</h3>
				<p class="text-sm text-zinc-400">{$t('landing.feature_routing_desc')}</p>
			</div>

			<!-- Usage Tracking -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<svg class="text-blue-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="20" x2="18" y2="10" />
					<line x1="12" y1="20" x2="12" y2="4" />
					<line x1="6" y1="20" x2="6" y2="14" />
				</svg>
				<h3 class="text-lg font-bold text-zinc-100 mb-2">{$t('landing.feature_usage_title')}</h3>
				<p class="text-sm text-zinc-400">{$t('landing.feature_usage_desc')}</p>
			</div>

			<!-- Response Caching -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<svg class="text-blue-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
				</svg>
				<h3 class="text-lg font-bold text-zinc-100 mb-2">{$t('landing.feature_cache_title')}</h3>
				<p class="text-sm text-zinc-400">{$t('landing.feature_cache_desc')}</p>
			</div>

			<!-- Works With Your Tools -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<svg class="text-blue-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="16 18 22 12 16 6" />
					<polyline points="8 6 2 12 8 18" />
				</svg>
				<h3 class="text-lg font-bold text-zinc-100 mb-2">{$t('landing.feature_tools_title')}</h3>
				<p class="text-sm text-zinc-400">{$t('landing.feature_tools_desc')}</p>
			</div>
		</div>
	</div>
</section>
