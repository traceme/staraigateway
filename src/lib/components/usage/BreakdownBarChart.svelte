<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip } from 'chart.js';

	Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

	type Props = {
		data: Array<{ label: string; value: number }>;
		formatValue?: (v: number) => string;
	};

	let { data, formatValue = (v: number) => `$${v.toFixed(2)}` }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function createChart() {
		if (chart) chart.destroy();
		if (!canvas) return;

		const height = data.length * 40 + 60;
		canvas.parentElement!.style.height = `${height}px`;

		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: data.map((d) => d.label),
				datasets: [
					{
						label: 'Cost',
						data: data.map((d) => d.value),
						backgroundColor: 'rgba(59, 130, 246, 0.6)',
						hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
						borderRadius: 4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				indexAxis: 'y',
				plugins: {
					tooltip: {
						backgroundColor: '#27272a',
						borderColor: '#3f3f46',
						borderWidth: 1,
						cornerRadius: 6,
						titleColor: '#fafafa',
						bodyColor: '#a1a1aa',
						callbacks: {
							label: (ctx) => formatValue(ctx.parsed.x ?? 0)
						}
					}
				},
				scales: {
					x: {
						grid: { color: '#27272a' },
						ticks: {
							color: '#a1a1aa',
							callback: (value) => `$${value}`
						}
					},
					y: {
						grid: { display: false },
						ticks: { color: '#a1a1aa' }
					}
				}
			}
		});
	}

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});

	$effect(() => {
		if (data && canvas) createChart();
	});
</script>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	<h3 class="mb-4 text-sm font-medium text-zinc-400">Cost Breakdown</h3>
	<div>
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
