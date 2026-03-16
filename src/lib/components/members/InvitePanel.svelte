<script lang="ts">
	import { enhance } from '$app/forms';

	type Props = {
		orgSlug: string;
		onClose: () => void;
	};

	let { orgSlug, onClose }: Props = $props();

	let role = $state<'member' | 'admin'>('member');
	let submitting = $state(false);
	let error = $state('');

	const roleDescriptions: Record<string, string> = {
		member: 'Can create API keys and view personal usage. Cannot manage other members.',
		admin: 'Can invite/remove members, manage API keys, and configure budgets.'
	};

	const roleDescription = $derived(roleDescriptions[role]);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-40 bg-black/50"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
></div>

<!-- Panel -->
<div
	class="fixed top-0 right-0 z-50 h-full w-[400px] border-l border-zinc-800 bg-zinc-900 transition-transform duration-200 ease-out"
	role="dialog"
	aria-labelledby="invite-panel-title"
>
	<div class="flex h-full flex-col overflow-y-auto p-6">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<h2 id="invite-panel-title" class="text-lg font-semibold text-zinc-50">Invite Member</h2>
			<button
				class="rounded p-1 text-zinc-400 hover:text-zinc-200"
				aria-label="Close"
				onclick={onClose}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
		</div>

		<form
			method="POST"
			action="/org/{orgSlug}/members?/invite"
			use:enhance={() => {
				submitting = true;
				error = '';
				return async ({ result, update }) => {
					submitting = false;
					if (result.type === 'failure') {
						error = (result.data as { error?: string })?.error ?? 'Failed to send invitation';
					} else {
						await update();
						onClose();
					}
				};
			}}
		>
			<!-- Email -->
			<label class="mb-1 block text-sm font-medium text-zinc-300" for="invite-email">
				Email address
			</label>
			<input
				id="invite-email"
				type="email"
				name="email"
				required
				placeholder="colleague@company.com"
				class="mb-4 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-blue-600"
			/>

			<!-- Role -->
			<label class="mb-1 block text-sm font-medium text-zinc-300" for="invite-role">
				Role
			</label>
			<select
				id="invite-role"
				name="role"
				bind:value={role}
				class="mb-2 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-600"
			>
				<option value="member">Member</option>
				<option value="admin">Admin</option>
			</select>
			<p class="mb-6 text-xs text-zinc-500">{roleDescription}</p>

			<!-- Error -->
			{#if error}
				<p class="mb-4 text-sm text-red-400">{error}</p>
			{/if}

			<!-- Submit -->
			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{#if submitting}
					<span class="inline-flex items-center gap-2">
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25" />
							<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" class="opacity-75" />
						</svg>
						Sending...
					</span>
				{:else}
					Send Invitation
				{/if}
			</button>
		</form>
	</div>
</div>
