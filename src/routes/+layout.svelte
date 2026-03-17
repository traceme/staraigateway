<script>
	import '../app.css';
	import '$lib/i18n';
	import { locale } from 'svelte-i18n';

	let { data, children } = $props();

	$effect(() => {
		locale.set(data.locale);
	});
</script>

{@render children()}
