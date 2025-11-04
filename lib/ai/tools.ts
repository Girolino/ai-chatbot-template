import type { ToolSet } from 'ai';
import { tool } from 'ai';
import { getWriter } from '@ai-sdk-tools/artifacts';
import { z } from 'zod';
import { anthropic } from './provider';
import type { AnthropicSkillConfig } from './provider-options';
import { textNoteArtifact } from './artifacts';

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

const textNoteInputSchema = z.object({
  title: z
    .string()
    .max(120)
    .describe('Short heading for the note panel')
    .default('Note'),
  body: z
    .string()
    .min(1, 'Provide the note body text')
    .describe('Main content of the note. Supports markdown.'),
  tone: z
    .enum(['default', 'success', 'warning', 'info'])
    .describe('Optional tone to help style the card')
    .optional(),
});

const textNoteTool = tool({
  description:
    'Render a formatted note in a dedicated panel when you need to highlight key points, summaries or checklists.',
  inputSchema: textNoteInputSchema,
  execute: async ({ title, body, tone }, executionOptions) => {
    let writer;

    try {
      writer = getWriter(executionOptions);
    } catch {
      writer = undefined;
    }

    if (!writer) {
      return {
        status: 'fallback',
        title,
        body,
        tone: tone ?? 'default',
      };
    }

    const note = textNoteArtifact.stream(
      {
        title,
        body: '',
        tone: tone ?? 'default',
      },
      writer,
    );

    await note.update({
      title,
      body,
      tone: tone ?? 'default',
    });

    await note.complete({
      title,
      body,
      tone: tone ?? 'default',
    });

    return {
      status: 'rendered',
      title,
    };
  },
});

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

  tools.note = textNoteTool;

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  return tools as ToolSet;
};
