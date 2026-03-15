export type ProviderGroup = 'global' | 'china' | 'custom';

export interface ProviderDef {
	id: string;
	name: string;
	group: ProviderGroup;
	modelsEndpoint: string;
	authHeader: string; // 'Bearer' for most, 'x-api-key' for Anthropic
	docsUrl: string;
	baseUrl: string;
	description: string;
}

export const PROVIDERS: ProviderDef[] = [
	// Global providers
	{
		id: 'openai',
		name: 'OpenAI',
		group: 'global',
		modelsEndpoint: '/v1/models',
		authHeader: 'Bearer',
		docsUrl: 'https://platform.openai.com/api-keys',
		baseUrl: 'https://api.openai.com',
		description: 'GPT-4o, GPT-4o-mini, o1, o3'
	},
	{
		id: 'anthropic',
		name: 'Anthropic',
		group: 'global',
		modelsEndpoint: '/v1/models',
		authHeader: 'x-api-key',
		docsUrl: 'https://console.anthropic.com/settings/keys',
		baseUrl: 'https://api.anthropic.com',
		description: 'Claude Opus, Sonnet, Haiku'
	},
	{
		id: 'google',
		name: 'Google AI',
		group: 'global',
		modelsEndpoint: '/v1beta/models',
		authHeader: 'Bearer',
		docsUrl: 'https://aistudio.google.com/app/apikey',
		baseUrl: 'https://generativelanguage.googleapis.com',
		description: 'Gemini 2.5 Pro, Flash, Ultra'
	},
	{
		id: 'azure',
		name: 'Azure OpenAI',
		group: 'global',
		modelsEndpoint: '/openai/models?api-version=2024-02-01',
		authHeader: 'api-key',
		docsUrl: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub',
		baseUrl: 'https://YOUR_RESOURCE.openai.azure.com',
		description: 'GPT-4o, GPT-4 Turbo via Azure'
	},
	{
		id: 'mistral',
		name: 'Mistral AI',
		group: 'global',
		modelsEndpoint: '/v1/models',
		authHeader: 'Bearer',
		docsUrl: 'https://console.mistral.ai/api-keys',
		baseUrl: 'https://api.mistral.ai',
		description: 'Mistral Large, Medium, Small'
	},
	{
		id: 'cohere',
		name: 'Cohere',
		group: 'global',
		modelsEndpoint: '/v1/models',
		authHeader: 'Bearer',
		docsUrl: 'https://dashboard.cohere.com/api-keys',
		baseUrl: 'https://api.cohere.ai',
		description: 'Command R+, Embed, Rerank'
	},

	// China providers
	{
		id: 'deepseek',
		name: 'DeepSeek',
		group: 'china',
		modelsEndpoint: '/models',
		authHeader: 'Bearer',
		docsUrl: 'https://platform.deepseek.com/api_keys',
		baseUrl: 'https://api.deepseek.com',
		description: 'DeepSeek-V3, DeepSeek-R1'
	},
	{
		id: 'qwen',
		name: 'Qwen (Alibaba)',
		group: 'china',
		modelsEndpoint: '/v1/models',
		authHeader: 'Bearer',
		docsUrl: 'https://dashscope.console.aliyun.com/apiKey',
		baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
		description: 'Qwen-Max, Qwen-Plus, Qwen-Turbo'
	},
	{
		id: 'glm',
		name: 'GLM (Zhipu AI)',
		group: 'china',
		modelsEndpoint: '/api/paas/v4/models',
		authHeader: 'Bearer',
		docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
		baseUrl: 'https://open.bigmodel.cn',
		description: 'GLM-4, GLM-4-Flash'
	},
	{
		id: 'doubao',
		name: 'Doubao (ByteDance)',
		group: 'china',
		modelsEndpoint: '/api/v3/models',
		authHeader: 'Bearer',
		docsUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
		baseUrl: 'https://ark.cn-beijing.volces.com',
		description: 'Doubao-Pro, Doubao-Lite'
	},

	// Custom OpenAI-compatible
	{
		id: 'custom',
		name: 'Custom / OpenAI-compatible',
		group: 'custom',
		modelsEndpoint: '/v1/models',
		authHeader: 'Bearer',
		docsUrl: '',
		baseUrl: '',
		description: 'Any OpenAI-compatible endpoint'
	}
];

export function getProvider(id: string): ProviderDef | undefined {
	return PROVIDERS.find((p) => p.id === id);
}
