<script lang="ts">
	import LandingNav from '$lib/components/landing/LandingNav.svelte';
	import ToolTabs from '$lib/components/docs/ToolTabs.svelte';
	import IntegrationGuide from '$lib/components/docs/IntegrationGuide.svelte';

	let activeTab = $state('cursor');

	const tabs = [
		{ id: 'cursor', label: 'Cursor' },
		{ id: 'continue', label: 'Continue.dev' },
		{ id: 'claude-code', label: 'Claude Code' }
	];

	const cursorSteps = [
		{
			title: 'Open Cursor Settings',
			description: 'Go to Settings > Models > OpenAI API Key.'
		},
		{
			title: 'Set the API Base URL',
			description: 'Replace the default OpenAI URL with your LLMTokenHub instance.',
			code: 'https://your-instance.com/v1'
		},
		{
			title: 'Paste your API key',
			description: 'Copy an API key from your LLMTokenHub dashboard and paste it here.',
			code: 'sk-lth-xxxxxxxxxxxx'
		},
		{
			title: 'Verify the connection',
			description: 'Send a test message in Cursor. You should see a response from the model configured in your organization.'
		}
	];

	const continueSteps = [
		{
			title: 'Open Continue configuration',
			description: 'Open your Continue config file at ~/.continue/config.json.'
		},
		{
			title: 'Add the LLMTokenHub provider',
			description: 'Add the following to your models array:',
			code: `{
  "title": "LLMTokenHub",
  "provider": "openai",
  "model": "gpt-4o",
  "apiBase": "https://your-instance.com/v1",
  "apiKey": "sk-lth-xxxxxxxxxxxx"
}`
		},
		{
			title: 'Reload Continue',
			description: 'Restart VS Code or reload the Continue extension to apply changes.'
		},
		{
			title: 'Verify the connection',
			description: 'Open the Continue sidebar and send a test message.'
		}
	];

	const claudeCodeSteps = [
		{
			title: 'Set environment variables',
			description: 'Add these to your shell profile (.bashrc, .zshrc, etc.):',
			code: `export ANTHROPIC_BASE_URL=https://your-instance.com/v1
export ANTHROPIC_API_KEY=sk-lth-xxxxxxxxxxxx`
		},
		{
			title: 'Reload your shell',
			description: 'Run source ~/.zshrc or open a new terminal window.',
			code: 'source ~/.zshrc'
		},
		{
			title: 'Verify the connection',
			description: 'Run claude and send a test message. Responses should route through your LLMTokenHub instance.'
		}
	];

	function getSteps(tab: string) {
		switch (tab) {
			case 'cursor':
				return cursorSteps;
			case 'continue':
				return continueSteps;
			case 'claude-code':
				return claudeCodeSteps;
			default:
				return cursorSteps;
		}
	}
</script>

<svelte:head>
	<title>Integration Guides - LLMTokenHub</title>
</svelte:head>

<LandingNav />

<main class="max-w-3xl mx-auto px-6 py-16 pt-24">
	<h1 class="text-[30px] font-bold text-zinc-50 mb-2">Integration Guides</h1>
	<p class="text-zinc-400 mb-8">Connect your favorite tools to LLMTokenHub in minutes.</p>

	<ToolTabs {activeTab} {tabs} onTabChange={(tab) => (activeTab = tab)} />

	<div role="tabpanel" aria-labelledby={activeTab}>
		<IntegrationGuide steps={getSteps(activeTab)} />
	</div>
</main>
