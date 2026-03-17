<script lang="ts">
	import { t } from 'svelte-i18n';

	const items = [
		{
			titleKey: 'onboarding.add_provider_key',
			subtitle: 'Coming in Phase 2'
		},
		{
			titleKey: 'onboarding.invite_members',
			subtitle: 'Coming in Phase 4'
		},
		{
			titleKey: 'onboarding.create_api_key',
			subtitle: 'Coming in Phase 2'
		}
	];
</script>

<div class="rounded-lg bg-zinc-800 p-6">
	<h2 class="mb-4 text-lg font-semibold text-zinc-50">{$t('onboarding.get_started')}</h2>

	<div class="space-y-3">
		{#each items as item}
			<div class="flex items-start gap-3">
				<!-- Disabled checkbox -->
				<div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-zinc-600 bg-zinc-700">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="text-zinc-500"
					>
						<rect x="3" y="11" width="18" height="2" rx="1" />
					</svg>
				</div>

				<div>
					<p class="text-sm font-medium text-zinc-500">{$t(item.titleKey)}</p>
					<p class="text-xs text-zinc-600">{item.subtitle}</p>
				</div>
			</div>
		{/each}
	</div>
</div>
