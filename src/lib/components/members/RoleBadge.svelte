<script lang="ts">
	type Props = {
		role: 'owner' | 'admin' | 'member' | 'pending';
	};

	let { role }: Props = $props();

	const colorMap: Record<string, string> = {
		owner: 'bg-green-900/40 text-green-400',
		admin: 'bg-blue-900/40 text-blue-400',
		member: 'bg-zinc-800 text-zinc-400',
		pending: 'bg-amber-900/40 text-amber-400'
	};

	const colors = $derived(colorMap[role] ?? colorMap.member);
</script>

<span class="text-xs font-bold px-2 py-0.5 rounded-full {colors}">
	{role.charAt(0).toUpperCase() + role.slice(1)}
</span>
