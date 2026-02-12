import { Agent } from '@convex-dev/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { components } from './_generated/api';

/**
 * Create a language model configured for OpenRouter
 */
export function createLanguageModel(modelId: string, apiKey?: string) {
    const openrouter = createOpenRouter({
        apiKey: apiKey ?? process.env.OPENROUTER_API_KEY,
    });

    return openrouter.chat(modelId);
}

/**
 * Create an agent with a specific model
 */
export function createAgentWithModel(modelId: string, apiKey?: string) {
    return new Agent(components.agent, {
        name: 'ChatGBeanT Assistant',
        languageModel: createLanguageModel(modelId, apiKey),
        instructions: 'You are a helpful AI assistant. Be concise and helpful in your responses.',
    });
}

/**
 * Default chat agent configured for OpenRouter (used for thread creation)
 */
export const chatAgent = createAgentWithModel('anthropic/claude-3.5-haiku');
