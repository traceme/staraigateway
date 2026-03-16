<script lang="ts">
	let {
		currentSpend,
		limit
	}: {
		currentSpend: number;
		limit: number;
	} = $props();

	let dismissed = $state(false);
</script>

{#if !dismissed}
	<div class="flex items-center justify-between rounded-lg border border-amber-700/50 bg-amber-900/30 px-4 py-3">
		<div class="flex items-center gap-3">
			<!-- Warning icon -->
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="shrink-0 text-amber-400">
				<path d="M8 1L1 14h14L8 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
				<path d="M8 6v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				<circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
			</svg>
			<p class="text-sm text-amber-200">
				You've used ${currentSpend.toFixed(2)} of your ${limit.toFixed(2)} monthly limit. Contact your admin to increase your budget.
			</p>
		</div>
		<button
			class="shrink-0 rounded p-1 text-amber-400 hover:text-amber-200"
			aria-label="Close"
			onclick={() => (dismissed = true)}
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M4 4l8 8M12 4l-8 8" />
			</svg>
		</button>
	</div>
{/if}
