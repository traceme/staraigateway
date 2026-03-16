<script lang="ts">
	type Props = {
		currentOrg: { slug: string; name: string };
		currentPath: string;
	};

	let { currentOrg, currentPath }: Props = $props();

	const navItems = [
		{
			label: 'Dashboard',
			href: `/org/${currentOrg.slug}/dashboard`,
			icon: 'grid',
			active: true
		},
		{
			label: 'Provider Keys',
			href: `/org/${currentOrg.slug}/provider-keys`,
			icon: 'key',
			active: true
		},
		{
			label: 'API Keys',
			href: `/org/${currentOrg.slug}/api-keys`,
			icon: 'code',
			active: true
		},
		{
			label: 'Members',
			href: `/org/${currentOrg.slug}/members`,
			icon: 'users',
			active: true
		},
		{
			label: 'Usage',
			href: `/org/${currentOrg.slug}/usage`,
			icon: 'chart',
			active: true
		},
		{
			label: 'Models',
			href: `/org/${currentOrg.slug}/models`,
			icon: 'cpu',
			active: true
		},
		{
			label: 'Settings',
			href: `/org/${currentOrg.slug}/settings`,
			icon: 'gear',
			active: true
		}
	];

	function isActive(itemHref: string): boolean {
		return currentPath.startsWith(itemHref) && itemHref !== '#';
	}
</script>

<nav class="flex h-full flex-col">
	<!-- Brand -->
	<div class="flex h-14 items-center border-b border-zinc-800 px-4">
		<span class="text-lg font-bold text-zinc-50">LLMTokenHub</span>
	</div>

	<!-- Navigation items -->
	<div class="flex-1 space-y-1 p-3">
		{#each navItems as item}
			{@const active = isActive(item.href)}
			{#if item.active}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors {active
						? 'bg-blue-600 text-white'
						: 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'}"
				>
					<span class="w-5 text-center">{@html getIcon(item.icon)}</span>
					{item.label}
				</a>
			{:else}
				<div
					class="group relative flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600"
					title={item.tooltip}
				>
					<span class="w-5 text-center">{@html getIcon(item.icon)}</span>
					{item.label}
					<span
						class="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 group-hover:block"
					>
						{item.tooltip}
					</span>
				</div>
			{/if}
		{/each}
	</div>
</nav>

<script lang="ts" module>
	function getIcon(name: string): string {
		const icons: Record<string, string> = {
			grid: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
			key: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
			code: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
			users: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
			chart: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
			cpu: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>',
			gear: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
		};
		return icons[name] ?? '';
	}
</script>
