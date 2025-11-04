import type { AnthropicModelId } from './models';

export type BuildProviderOptionsParams = {
  model: string;
  extendedThinking?: boolean;
  thinkingBudgetTokens?: number;
};

export type AnthropicProviderOptions = {
  thinking?: {
    type: 'enabled';
    budgetTokens?: number;
  };
};

export type ProviderOptions = {
  anthropic?: AnthropicProviderOptions;
};

const DEFAULT_THINKING_BUDGET_TOKENS = 12_000;

const isAnthropicModel = (model: string): model is AnthropicModelId =>
  model.startsWith('anthropic/');

export const buildProviderOptions = ({
  model,
  extendedThinking = false,
  thinkingBudgetTokens = DEFAULT_THINKING_BUDGET_TOKENS,
}: BuildProviderOptionsParams): ProviderOptions | undefined => {
  if (!extendedThinking || !isAnthropicModel(model)) {
    return undefined;
  }

  return {
    anthropic: {
      thinking: {
        type: 'enabled',
        budgetTokens: thinkingBudgetTokens,
      },
    },
  };
};
