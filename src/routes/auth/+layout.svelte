<script>
	let { children } = $props();
</script>

<svelte:head>
	<title>StarAIGateway</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-50">StarAIGateway</h1>
			<p class="mt-1 text-sm text-zinc-400">Enterprise AI tool sharing</p>
		</div>
		{@render children()}
	</div>
</div>
