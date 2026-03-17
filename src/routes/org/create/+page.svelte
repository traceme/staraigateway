<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from 'svelte-i18n';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>{$t('org_create.title')} - StarAIGateway</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-md">
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
			<h1 class="mb-2 text-center text-2xl font-bold text-zinc-50">{$t('org_create.title')}</h1>
			<p class="mb-6 text-center text-sm text-zinc-400">
				{$t('org_create.subtitle')}
			</p>

			{#if form?.errorKey}
				<div class="mb-4 rounded-md bg-red-900/50 p-3 text-sm text-red-300">
					{$t(form.errorKey)}
				</div>
			{/if}

			<form method="POST" use:enhance class="space-y-4">
				<div>
					<label for="name" class="mb-1 block text-sm font-medium text-zinc-300">
						{$t('org_create.name_label')}
					</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						minlength={2}
						maxlength={50}
						value={form?.name ?? ''}
						placeholder={$t('org_create.name_placeholder')}
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="description" class="mb-1 block text-sm font-medium text-zinc-300">
						{$t('org_create.description_label')} <span class="text-zinc-500">(optional)</span>
					</label>
					<textarea
						id="description"
						name="description"
						maxlength={200}
						rows={3}
						placeholder={$t('org_create.description_placeholder')}
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-50 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>{form?.description ?? ''}</textarea>
				</div>

				<button
					type="submit"
					class="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
				>
					{$t('org_create.submit')}
				</button>
			</form>
		</div>
	</div>
</main>
