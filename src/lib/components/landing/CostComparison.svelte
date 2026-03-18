<script>
	import { t } from 'svelte-i18n';
</script>

<section class="py-16 bg-zinc-900/50">
	<div class="max-w-4xl mx-auto px-6">
		<h2 class="text-[30px] font-bold text-zinc-50 text-center mb-12">
			{$t('landing.cost_heading')}
		</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- Per-Seat Subscriptions -->
			<div class="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
				<h3 class="text-lg font-bold text-zinc-100 mb-4">{$t('landing.cost_perseat_title')}</h3>
				<ul class="space-y-3">
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<span class="text-zinc-500 mt-0.5">&bull;</span>
						{$t('landing.cost_perseat_chatgpt')}
					</li>
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<span class="text-zinc-500 mt-0.5">&bull;</span>
						{$t('landing.cost_perseat_copilot')}
					</li>
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<span class="text-zinc-500 mt-0.5">&bull;</span>
						{$t('landing.cost_perseat_claude')}
					</li>
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<span class="text-zinc-500 mt-0.5">&bull;</span>
						{$t('landing.cost_perseat_total')}
					</li>
				</ul>
			</div>

			<!-- Pooled API Keys -->
			<div class="bg-zinc-900 rounded-lg border border-blue-600/50 p-6">
				<h3 class="text-lg font-bold text-zinc-100 mb-4">{$t('landing.cost_pooled_title')}</h3>
				<ul class="space-y-3">
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<svg class="text-green-500 mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{$t('landing.cost_pooled_1')}
					</li>
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<svg class="text-green-500 mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{$t('landing.cost_pooled_2')}
					</li>
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<svg class="text-green-500 mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{$t('landing.cost_pooled_3')}
					</li>
					<li class="text-sm text-zinc-400 flex items-start gap-2">
						<svg class="text-green-500 mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
						{$t('landing.cost_pooled_4')}
					</li>
				</ul>
			</div>
		</div>
		<p class="text-2xl font-bold text-green-500 text-center mt-8">
			{$t('landing.cost_savings')}
		</p>
	</div>
</section>
