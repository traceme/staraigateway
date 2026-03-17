<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';

	let open = $state(false);

	const languages = [
		{ code: 'en', label: 'EN' },
		{ code: 'zh', label: '中文' }
	] as const;

	function currentLabel(): string {
		return $locale === 'zh' ? '中文' : 'EN';
	}

	async function switchLanguage(lang: string) {
		await fetch('/api/user/language', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ language: lang })
		});
		locale.set(lang);
		await invalidateAll();
		open = false;
	}
</script>

<div class="relative">
	<button
		class="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
		onclick={() => (open = !open)}
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
		<span>{currentLabel()}</span>
	</button>

	{#if open}
		<div
			class="fixed inset-0 z-40"
			role="button"
			tabindex="-1"
			onclick={() => (open = false)}
			onkeydown={(e) => e.key === 'Escape' && (open = false)}
		></div>
		<div class="absolute right-0 z-50 mt-1 w-32 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
			{#each languages as lang}
				<button
					class="flex w-full items-center justify-between px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
					onclick={() => switchLanguage(lang.code)}
				>
					<span>{lang.label}</span>
					{#if $locale === lang.code}
						<span class="text-blue-400">&#10003;</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
