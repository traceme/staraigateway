<script lang="ts">
	import { enhance } from '$app/forms';
	import SmartRoutingToggle from './SmartRoutingToggle.svelte';

	type Props = {
		orgSlug: string;
		orgHasRouting?: boolean;
		onclose: () => void;
		oncreated: (fullKey: string) => void;
	};

	let { orgSlug, orgHasRouting = false, onclose, oncreated }: Props = $props();
	let name = $state('');
	let error = $state('');
	let submitting = $state(false);
	let smartRoutingEnabled = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<div class="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
		<h2 class="text-lg font-semibold text-zinc-100">Create API Key</h2>
		<p class="mt-1 text-sm text-zinc-400">
			Create a personal API key for use with Cursor, Continue.dev, Claude Code, or other tools.
		</p>

		<form
			method="POST"
			action="/org/{orgSlug}/api-keys?/create"
			use:enhance={() => {
				submitting = true;
				error = '';
				return async ({ result }) => {
					submitting = false;
					if (result.type === 'success' && result.data?.fullKey) {
						oncreated(result.data.fullKey as string);
					} else if (result.type === 'failure') {
						error = (result.data?.error as string) ?? 'Failed to create key';
					}
				};
			}}
			class="mt-4"
		>
			<label for="key-name" class="block text-sm font-medium text-zinc-300">Name</label>
			<input
				id="key-name"
				type="text"
				name="name"
				bind:value={name}
				placeholder="e.g., Cursor, Claude Code CLI"
				required
				maxlength={50}
				class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>

			{#if error}
				<p class="mt-2 text-sm text-red-400">{error}</p>
			{/if}

			<SmartRoutingToggle bind:enabled={smartRoutingEnabled} {orgHasRouting} />

			<div class="mt-4 flex justify-end gap-3">
				<button
					type="button"
					onclick={onclose}
					class="rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={submitting || !name.trim()}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{submitting ? 'Creating...' : 'Create Key'}
				</button>
			</div>
		</form>
	</div>
</div>
