<script lang="ts">
	import { t } from 'svelte-i18n';

	type Props = {
		currentOrg: { id: string; name: string; slug: string };
		userOrgs: { id: string; name: string; slug: string }[];
	};

	let { currentOrg, userOrgs }: Props = $props();
	let open = $state(false);
</script>

<div class="relative">
	<button
		class="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
		onclick={() => (open = !open)}
	>
		<span>{currentOrg.name}</span>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="transition-transform {open ? 'rotate-180' : ''}"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	{#if open}
		<div
			class="fixed inset-0 z-40"
			role="button"
			tabindex="-1"
			onclick={() => (open = false)}
			onkeydown={(e) => e.key === 'Escape' && (open = false)}
		></div>
		<div class="absolute left-0 z-50 mt-1 w-56 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
			{#each userOrgs as org}
				<a
					href="/org/{org.slug}/dashboard"
					class="flex items-center gap-2 px-3 py-2 text-sm transition-colors {org.id === currentOrg.id
						? 'bg-blue-600/20 text-blue-400'
						: 'text-zinc-50 hover:bg-blue-600/10'}"
					onclick={() => (open = false)}
				>
					<span class="flex h-6 w-6 items-center justify-center rounded bg-zinc-700 text-xs font-medium text-zinc-300">
						{org.name.charAt(0).toUpperCase()}
					</span>
					{org.name}
				</a>
			{/each}

			<div class="border-t border-zinc-700 mt-1 pt-1">
				<a
					href="/org/create"
					class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
					onclick={() => (open = false)}
				>
					<span class="flex h-6 w-6 items-center justify-center rounded border border-dashed border-zinc-600 text-xs text-zinc-500">+</span>
					{$t('org_switcher.create_new')}
				</a>
			</div>
		</div>
	{/if}
</div>
