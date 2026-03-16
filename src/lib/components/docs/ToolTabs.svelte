<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	type Tab = {
		id: string;
		label: string;
	};

	type Props = {
		activeTab: string;
		tabs: Tab[];
		onTabChange: (tab: string) => void;
	};

	let { activeTab, tabs, onTabChange }: Props = $props();

	onMount(() => {
		if (browser && location.hash) {
			const hash = location.hash.slice(1);
			const match = tabs.find((t) => t.id === hash);
			if (match) {
				onTabChange(match.id);
			}
		}
	});

	function handleClick(tabId: string) {
		onTabChange(tabId);
		if (browser) {
			location.hash = `#${tabId}`;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		const currentIndex = tabs.findIndex((t) => t.id === activeTab);
		let newIndex = currentIndex;

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			newIndex = (currentIndex + 1) % tabs.length;
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			return;
		} else {
			return;
		}

		handleClick(tabs[newIndex].id);
		const tabEl = document.querySelector(`[data-tab-id="${tabs[newIndex].id}"]`);
		if (tabEl instanceof HTMLElement) {
			tabEl.focus();
		}
	}
</script>

<div class="flex gap-0 border-b border-zinc-800 mb-8" role="tablist" onkeydown={handleKeydown}>
	{#each tabs as tab}
		<button
			type="button"
			role="tab"
			data-tab-id={tab.id}
			aria-selected={activeTab === tab.id}
			tabindex={activeTab === tab.id ? 0 : -1}
			class="px-4 py-2 text-sm font-bold cursor-pointer {activeTab === tab.id
				? 'text-blue-500 border-b-2 border-blue-500'
				: 'text-zinc-400 hover:text-zinc-300'}"
			onclick={() => handleClick(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
