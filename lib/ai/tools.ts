import type { ToolSet } from 'ai';
import { anthropic } from './provider';
import type { AnthropicSkillConfig } from './provider-options';

export type BuildAnthropicToolsParams = {
  enableMemory?: boolean;
  enableWebSearch?: boolean;
  enableWebFetch?: boolean;
  enableSkills?: boolean;
};

type ToolRegistry = ToolSet;

type MemoryLogEntry = {
  timestamp: string;
  action: unknown;
};

const memoryLog: MemoryLogEntry[] = [];

const memoryTool = anthropic.tools.memory_20250818({
  execute: async (action) => {
    memoryLog.push({ action, timestamp: new Date().toISOString() });
    return {
      status: 'stored',
      entries: memoryLog.slice(-10),
    };
  },
});

const webSearchTool = anthropic.tools.webSearch_20250305({
  maxUses: 3,
});

const webFetchTool = anthropic.tools.webFetch_20250910({
  maxUses: 1,
  citations: { enabled: true },
});

const codeExecutionTool = anthropic.tools.codeExecution_20250825();

export const DEFAULT_SKILLS: AnthropicSkillConfig[] = [
  {
    type: 'anthropic',
    skillId: 'pptx',
    version: 'latest',
  },
];

export const buildAnthropicTools = ({
  enableMemory = false,
  enableWebSearch = false,
  enableWebFetch = false,
  enableSkills = false,
}: BuildAnthropicToolsParams): ToolSet | undefined => {
  const tools: Record<string, unknown> = {};

  if (enableMemory) {
    tools.memory = memoryTool;
  }

  if (enableWebFetch) {
    tools.web_fetch = webFetchTool;
  }

  if (enableWebSearch) {
    tools.web_search = webSearchTool;
  }

  if (enableSkills) {
    tools.code_execution = codeExecutionTool;
  }

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  return tools as ToolSet;
};
