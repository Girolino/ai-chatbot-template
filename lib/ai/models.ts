export const WEB_SEARCH_MODEL = 'perplexity/sonar';

export type AnthropicModelId =
  | 'anthropic/claude-haiku-4.5'
  | 'anthropic/claude-sonnet-4.5';

export type AnthropicModelDefinition = {
  id: AnthropicModelId;
  label: string;
};

export const ANTHROPIC_MODELS: AnthropicModelDefinition[] = [
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
];

export const DEFAULT_ANTHROPIC_MODEL: AnthropicModelId =
  'anthropic/claude-haiku-4.5';

const allowedAnthropicModelIds = new Set<AnthropicModelId>(
  ANTHROPIC_MODELS.map((model) => model.id),
);

export const isAnthropicModelId = (
  model: string | undefined,
): model is AnthropicModelId =>
  typeof model === 'string' && allowedAnthropicModelIds.has(model as AnthropicModelId);

export const resolveAnthropicModel = (
  model: string | undefined,
): AnthropicModelId =>
  isAnthropicModelId(model) ? model : DEFAULT_ANTHROPIC_MODEL;
