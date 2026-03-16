<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import LandingHero from '$lib/components/landing/LandingHero.svelte';
	import FeaturesGrid from '$lib/components/landing/FeaturesGrid.svelte';
	import CostComparison from '$lib/components/landing/CostComparison.svelte';
	import SelfHostCta from '$lib/components/landing/SelfHostCta.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
</script>

<svelte:head>
	<title>LLMTokenHub - Share AI Access With Your Team</title>
</svelte:head>

<div class="bg-zinc-950 min-h-screen text-zinc-50">
	<LandingNav />
	<LandingHero />
	<FeaturesGrid />
	<CostComparison />
	<SelfHostCta />
	<LandingFooter />
</div>
