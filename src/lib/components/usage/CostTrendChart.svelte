<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

	type Props = {
		data: Array<{ date: string; cost: number }>;
	};

	let { data }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function createChart() {
		if (chart) chart.destroy();
		if (!canvas) return;

		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: data.map((d) => d.date),
				datasets: [
					{
						label: 'Daily Cost',
						data: data.map((d) => d.cost),
						borderColor: '#3b82f6',
						borderWidth: 2,
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: true,
						tension: 0.3,
						pointRadius: 3,
						pointHoverRadius: 5
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					tooltip: {
						backgroundColor: '#27272a',
						borderColor: '#3f3f46',
						borderWidth: 1,
						cornerRadius: 6,
						titleColor: '#fafafa',
						bodyColor: '#a1a1aa',
						callbacks: {
							label: (ctx) => `$${(ctx.parsed.y ?? 0).toFixed(2)}`
						}
					}
				},
				scales: {
					x: {
						grid: { color: '#27272a' },
						ticks: { color: '#a1a1aa', maxRotation: 45 }
					},
					y: {
						grid: { color: '#27272a' },
						ticks: {
							color: '#a1a1aa',
							callback: (value) => `$${value}`
						}
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
		// Re-create chart when data changes
		if (data && canvas) createChart();
	});
</script>

<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
	<h3 class="mb-4 text-sm font-medium text-zinc-400">Daily Cost Trend</h3>
	<div style="height: 280px;">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
