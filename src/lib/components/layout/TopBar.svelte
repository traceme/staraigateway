<script lang="ts">
	import OrgSwitcher from './OrgSwitcher.svelte';

	type Props = {
		currentOrg: { id: string; name: string; slug: string };
		userOrgs: { id: string; name: string; slug: string }[];
		user: { id: string; name: string; email: string };
		onToggleSidebar: () => void;
	};

	let { currentOrg, userOrgs, user, onToggleSidebar }: Props = $props();
	let userMenuOpen = $state(false);

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.toUpperCase()
			.substring(0, 2);
	}
</script>

<header class="fixed right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 lg:left-64">
	<!-- Left: hamburger (mobile) + org switcher -->
	<div class="flex items-center gap-3">
		<button
			class="rounded-md p-1 text-zinc-400 hover:text-zinc-200 lg:hidden"
			onclick={onToggleSidebar}
			aria-label="Toggle sidebar"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>
		<OrgSwitcher {currentOrg} {userOrgs} />
	</div>

	<!-- Right: user menu -->
	<div class="relative">
		<button
			class="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
			onclick={() => (userMenuOpen = !userMenuOpen)}
		>
			<div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
				{getInitials(user.name)}
			</div>
			<span class="hidden sm:inline">{user.name}</span>
		</button>

		{#if userMenuOpen}
			<div
				class="fixed inset-0 z-40"
				role="button"
				tabindex="-1"
				onclick={() => (userMenuOpen = false)}
				onkeydown={(e) => e.key === 'Escape' && (userMenuOpen = false)}
			></div>
			<div class="absolute right-0 z-50 mt-1 w-48 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
				<div class="border-b border-zinc-700 px-3 py-2">
					<p class="text-sm font-medium text-zinc-200">{user.name}</p>
					<p class="text-xs text-zinc-400">{user.email}</p>
				</div>
				<form method="POST" action="/auth/logout">
					<button
						type="submit"
						class="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
					>
						Log out
					</button>
				</form>
			</div>
		{/if}
	</div>
</header>
