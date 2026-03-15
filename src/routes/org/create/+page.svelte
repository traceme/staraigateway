<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Create Organization - LLMTokenHub</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
			<h1 class="mb-2 text-center text-2xl font-bold text-zinc-50">Create Organization</h1>
			<p class="mb-6 text-center text-sm text-zinc-400">
				Set up your team workspace to start sharing AI access.
			</p>

			{#if form?.error}
				<div class="mb-4 rounded-md bg-red-900/50 p-3 text-sm text-red-300">
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance class="space-y-4">
				<div>
					<label for="name" class="mb-1 block text-sm font-medium text-zinc-300">
						Organization Name
					</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						minlength={2}
						maxlength={50}
						value={form?.name ?? ''}
						placeholder="Acme Corp"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="description" class="mb-1 block text-sm font-medium text-zinc-300">
						Description <span class="text-zinc-500">(optional)</span>
					</label>
					<textarea
						id="description"
						name="description"
						maxlength={200}
						rows={3}
						placeholder="What does your team work on?"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>{form?.description ?? ''}</textarea>
				</div>

				<button
					type="submit"
					class="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
				>
					Create Organization
				</button>
			</form>
		</div>
	</div>
</main>
