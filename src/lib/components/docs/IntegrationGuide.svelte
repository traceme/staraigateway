<script lang="ts">
	import { t } from 'svelte-i18n';
	import CodeBlock from './CodeBlock.svelte';

	type Step = {
		title: string;
		description: string;
		code?: string;
	};

	type Props = {
		steps: Step[];
	};

	let { steps }: Props = $props();
</script>

<div class="space-y-8">
	{#each steps as step, i}
		<div>
			<div class="flex items-center">
				<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold mr-3">{i + 1}</span>
				<span class="text-sm font-bold text-zinc-100">{step.title}</span>
			</div>
			<p class="text-sm text-zinc-400 mt-2 ml-10">{step.description}</p>
			{#if step.code}
				<CodeBlock code={step.code} />
			{/if}
		</div>
	{/each}
</div>
