<script lang="ts">
	type Props = {
		code: string;
		language?: string;
	};

	let { code, language }: Props = $props();
	let copied = $state(false);

	function copyToClipboard() {
		navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<div class="relative rounded-lg bg-zinc-900 border border-zinc-800 p-4 mt-3 ml-10">
	<pre><code class="font-mono text-sm text-zinc-300">{code}</code></pre>
	<button
		type="button"
		class="absolute top-3 right-3 text-xs cursor-pointer {copied ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'}"
		aria-label="Copy code to clipboard"
		onclick={copyToClipboard}
	>
		{#if copied}
			<span aria-live="polite">Copied!</span>
		{:else}
			<span class="flex items-center gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
				Copy
			</span>
		{/if}
	</button>
</div>
