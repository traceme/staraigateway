<script lang="ts">
	import { t } from 'svelte-i18n';

	let {
		enabled = $bindable(false),
		orgHasRouting = false
	} = $props();

	function toggle() {
		if (orgHasRouting) {
			enabled = !enabled;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			toggle();
		}
	}
</script>

<div
	class="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 mt-4 {!orgHasRouting ? 'opacity-50 cursor-not-allowed' : ''}"
>
	<button
		type="button"
		role="switch"
		aria-checked={enabled}
		aria-label="Enable smart routing"
		aria-disabled={!orgHasRouting ? 'true' : undefined}
		tabindex={!orgHasRouting ? -1 : 0}
		onclick={toggle}
		onkeydown={handleKeydown}
		class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 {enabled ? 'bg-blue-600' : 'bg-zinc-700'}"
	>
		<span
			class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 {enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}"
			style="margin-top: 2px;"
		></span>
	</button>

	<div>
		<span class="text-sm font-bold text-zinc-200">{$t('api_keys.smart_routing')}</span>
		{#if orgHasRouting}
			<p class="text-xs text-zinc-500 mt-1">Automatically route simple queries to cheaper models.</p>
		{:else}
			<p class="text-xs text-zinc-500 mt-1">Configure smart routing models in organization settings first.</p>
		{/if}
	</div>

	<input type="hidden" name="smartRouting" value={enabled ? 'true' : 'false'} />
</div>
