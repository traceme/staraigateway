<script lang="ts">
	import { enhance } from '$app/forms';
	import { t } from 'svelte-i18n';

	let { data } = $props();
</script>

<svelte:head>
	<title>{$t('auth.invite.page_title')}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
	<div class="w-full max-w-md">
		{#if !data.valid}
			<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					class="mx-auto text-zinc-600"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				<h2 class="mt-4 text-lg font-semibold text-zinc-100">{$t('auth.invite.invalid_title')}</h2>
				<p class="mt-2 text-sm text-zinc-400">
					{$t('auth.invite.invalid_description')}
				</p>
				<a
					href="/"
					class="mt-6 inline-block rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
				>
					{$t('auth.invite.go_home')}
				</a>
			</div>
		{:else}
			<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
				<div class="text-center">
					<h1 class="text-xl font-bold text-zinc-50">StarAIGateway</h1>
					<h2 class="mt-4 text-lg font-semibold text-zinc-100">{$t('auth.invite.youre_invited')}</h2>
					<p class="mt-2 text-sm text-zinc-400">
						<span class="font-medium text-zinc-300">{data.inviterName}</span> has invited you to join
						<span class="font-medium text-zinc-300">{data.orgName}</span> as a
						<span
							class="inline-flex rounded-full px-2 py-0.5 text-xs font-bold {data.role === 'admin'
								? 'bg-blue-900/40 text-blue-400'
								: 'bg-zinc-800 text-zinc-400'}"
						>
							{data.role}
						</span>.
					</p>
				</div>

				<div class="mt-8 flex gap-3">
					<form method="POST" action="?/accept" use:enhance class="flex-1">
						<button
							type="submit"
							class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						>
							{$t('auth.invite.accept')}
						</button>
					</form>
					<form method="POST" action="?/decline" use:enhance class="flex-1">
						<button
							type="submit"
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
						>
							{$t('auth.invite.decline')}
						</button>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
