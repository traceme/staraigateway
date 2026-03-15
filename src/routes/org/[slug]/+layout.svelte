<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import { page } from '$app/stores';

	let { data, children } = $props();
	let sidebarOpen = $state(false);
</script>

<div class="flex min-h-screen">
	<!-- Mobile sidebar overlay -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-40 bg-black/50 lg:hidden"
			role="button"
			tabindex="-1"
			onclick={() => (sidebarOpen = false)}
			onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-50 w-64 transform bg-zinc-900 transition-transform duration-200 ease-in-out lg:translate-x-0 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<Sidebar currentOrg={data.currentOrg} currentPath={$page.url.pathname} />
	</aside>

	<!-- Main content area -->
	<div class="flex flex-1 flex-col lg:pl-64">
		<!-- Top bar -->
		<TopBar
			currentOrg={data.currentOrg}
			userOrgs={data.userOrgs}
			user={data.user}
			onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
		/>

		<!-- Page content -->
		<main class="flex-1 p-6 pt-20">
			{@render children()}
		</main>
	</div>
</div>
