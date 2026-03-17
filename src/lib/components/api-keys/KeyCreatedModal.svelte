<script lang="ts">
	import { t } from 'svelte-i18n';

	type Props = {
		fullKey: string;
		onclose: () => void;
	};

	let { fullKey, onclose }: Props = $props();
	let copied = $state(false);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(fullKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement('textarea');
			textarea.value = fullKey;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
	<div class="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
		<h2 class="text-lg font-semibold text-zinc-100">{$t('api_keys.key_created.title')}</h2>

		<!-- Warning banner -->
		<div class="mt-3 rounded-md border border-amber-700/50 bg-amber-900/30 px-4 py-3">
			<p class="text-sm font-medium text-amber-300">
				{$t('api_keys.key_created.warning')}
			</p>
		</div>

		<!-- Key display -->
		<div class="mt-4 flex items-center gap-2">
			<code
				class="flex-1 overflow-x-auto rounded-md bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-200 border border-zinc-700"
			>
				{fullKey}
			</code>
			<button
				onclick={copyToClipboard}
				class="shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
				title="Copy to clipboard"
			>
				{#if copied}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
				{/if}
			</button>
		</div>

		<p class="mt-3 text-xs text-zinc-500">
			{$t('api_keys.key_created.description')}
		</p>

		<div class="mt-5 flex justify-end">
			<button
				onclick={onclose}
				class="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600"
			>
				{$t('common.close')}
			</button>
		</div>
	</div>
</div>
