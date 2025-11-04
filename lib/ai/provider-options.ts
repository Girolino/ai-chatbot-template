import type { AnthropicModelId } from './models';

export type BuildProviderOptionsParams = {
  model: string;
  extendedThinking?: boolean;
  thinkingBudgetTokens?: number;
  skills?: AnthropicSkillConfig[];
};

export type AnthropicProviderOptions = {
  thinking?: {
    type: 'enabled';
    budgetTokens?: number;
  };
  container?: {
    skills: AnthropicSkillConfig[];
  };
};

export type AnthropicSkillConfig = {
  type: 'anthropic' | 'custom';
  skillId: string;
  version?: string;
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
  skills,
}: BuildProviderOptionsParams): ProviderOptions | undefined => {
  if (!isAnthropicModel(model)) {
    return undefined;
  }

  const anthropicOptions: AnthropicProviderOptions = {};

  if (extendedThinking) {
    anthropicOptions.thinking = {
      type: 'enabled',
      budgetTokens: thinkingBudgetTokens,
    };
  }

  if (skills?.length) {
    anthropicOptions.container = {
      skills,
    };
  }

  if (Object.keys(anthropicOptions).length === 0) {
    return undefined;
  }

  return { anthropic: anthropicOptions };
};
