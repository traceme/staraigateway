<script lang="ts">
	import { t } from 'svelte-i18n';

	type Props = {
		activeTab: string;
		onTabChange: (tab: string) => void;
	};

	let { activeTab, onTabChange }: Props = $props();

	const tabs = [
		{ id: 'overview', labelKey: 'usage.tabs.overview' },
		{ id: 'member', labelKey: 'usage.tabs.by_user' },
		{ id: 'model', labelKey: 'usage.tabs.by_model' }
	];
</script>

<div class="flex gap-2 border-b border-zinc-800">
	{#each tabs as tab}
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === tab.id
				? 'border-b-2 border-blue-500 text-zinc-50'
				: 'text-zinc-400 hover:text-zinc-300'}"
			onclick={() => onTabChange(tab.id)}
		>
			{$t(tab.labelKey)}
		</button>
	{/each}
</div>
