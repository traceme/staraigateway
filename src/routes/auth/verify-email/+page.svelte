<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Verify Email - StarAIGateway</title>
</svelte:head>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center">
	{#if data.success}
		<div class="mb-4 text-3xl">&#10003;</div>
		<h2 class="mb-2 text-lg font-medium text-zinc-50">Email verified!</h2>
		<p class="mb-6 text-sm text-zinc-400">Your email has been verified. You can now log in.</p>
		<a
			href="/auth/login"
			class="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
		>
			Log in
		</a>
	{:else}
		<div class="mb-4 text-3xl">&#10007;</div>
		<h2 class="mb-2 text-lg font-medium text-zinc-50">Verification failed</h2>
		<p class="mb-6 text-sm text-red-400">{data.error}</p>
		<a
			href="/auth/signup"
			class="inline-block rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
		>
			Sign up again
		</a>
	{/if}
</div>
