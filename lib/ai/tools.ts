import type { ToolSet } from 'ai';
import { tool } from 'ai';
import { getWriter } from '@ai-sdk-tools/artifacts';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';
import { anthropic } from './provider';
import type { AnthropicSkillConfig } from './provider-options';
import { textNoteArtifact } from './artifacts';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export type BuildAnthropicToolsParams = {
  enableMemory?: boolean;
  enableWebSearch?: boolean;
  enableWebFetch?: boolean;
  enableSkills?: boolean;
  memoryContext?: MemoryToolContext;
};

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

const createTextNoteTool = (context?: MemoryToolContext) =>
  tool({
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

      const resolvedTone = tone ?? 'default';

      const note = textNoteArtifact.stream(
        {
          title,
          body: '',
          tone: resolvedTone,
        },
        writer,
      );

      await note.update({
        title,
        body,
        tone: resolvedTone,
      });

      await note.complete({
        title,
        body,
        tone: resolvedTone,
      });

      if (context) {
        await context.convex.mutation(api.artifacts.upsert, {
          chatId: context.chatId,
          type: 'text-note',
          status: 'complete',
          payload: {
            title,
            body,
            tone: resolvedTone,
          },
        });
      }

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
  memoryContext,
}: BuildAnthropicToolsParams): ToolSet | undefined => {
  const tools: Record<string, unknown> = {};

  if (enableMemory && memoryContext) {
    tools.memory = createMemoryTool(memoryContext);
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

  tools.note = createTextNoteTool(memoryContext);

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  return tools as ToolSet;
};

type MemoryToolContext = {
  convex: ConvexHttpClient;
  chatId: Id<'chats'>;
  projectId?: string;
};

type MemoryToolAction = {
  command: string;
  path?: string;
  file_text?: string;
  old_str?: string;
  new_str?: string;
  insert_line?: number;
  insert_text?: string;
  old_path?: string;
  new_path?: string;
};

const toChatId = (chatId: string | Id<'chats'>): Id<'chats'> => chatId as Id<'chats'>;

const createMemoryTool = (context: MemoryToolContext) =>
  anthropic.tools.memory_20250818({
    execute: async (action: MemoryToolAction) => {
      switch (action.command) {
        case 'view': {
          const path = action.path ?? '';
          if (!path) {
            return {
              status: 'error',
              path,
              error: 'Path is required',
            } as const;
          }

          const file = await context.convex.query(api.memory.readMemoryFile, {
            chatId: toChatId(context.chatId),
            path,
          });

          return {
            status: file ? 'ok' : 'not_found',
            path,
            content: file?.content ?? '',
            updatedAt: file?.updatedAt ?? null,
          };
        }
        case 'create': {
          const path = action.path ?? '';
          if (!path) {
            return {
              status: 'error',
              path,
              error: 'Path is required',
            } as const;
          }

          if (typeof action.file_text === 'string') {
            await context.convex.mutation(api.memory.writeMemoryFile, {
              chatId: toChatId(context.chatId),
              path,
              content: action.file_text,
            });
          }
          return { status: 'created', path } as const;
        }
        case 'str_replace': {
          const path = action.path ?? '';
          if (!path) {
            return {
              status: 'error',
              path,
              error: 'Path is required',
            } as const;
          }

          const file = await context.convex.query(api.memory.readMemoryFile, {
            chatId: toChatId(context.chatId),
            path,
          });
          if (!file) {
            return {
              status: 'not_found',
              path,
              error: 'File not found',
            };
          }
          const updated = file.content.replace(action.old_str ?? '', action.new_str ?? '');
          await context.convex.mutation(api.memory.writeMemoryFile, {
            chatId: toChatId(context.chatId),
            path,
            content: updated,
          });
          return { status: 'updated', path } as const;
        }
        case 'insert': {
          const path = action.path ?? '';
          if (!path) {
            return {
              status: 'error',
              path,
              error: 'Path is required',
            } as const;
          }

          const file = await context.convex.query(api.memory.readMemoryFile, {
            chatId: toChatId(context.chatId),
            path,
          });
          const existing = file?.content ?? '';
          const lines = existing.split('\n');
          const insertIndex = Math.min(
            Math.max(action.insert_line ?? lines.length, 0),
            lines.length,
          );
          lines.splice(insertIndex, 0, action.insert_text ?? '');
          await context.convex.mutation(api.memory.writeMemoryFile, {
            chatId: toChatId(context.chatId),
            path,
            content: lines.join('\n'),
          });
          return { status: 'updated', path } as const;
        }
        case 'delete': {
          const path = action.path ?? '';
          if (!path) {
            return {
              status: 'error',
              path,
              error: 'Path is required',
            } as const;
          }

          await context.convex.mutation(api.memory.deleteMemoryFile, {
            chatId: toChatId(context.chatId),
            path,
          });
          return { status: 'deleted', path } as const;
        }
        case 'rename': {
          if (action.old_path && action.new_path) {
            await context.convex.mutation(api.memory.renameMemoryFile, {
              chatId: toChatId(context.chatId),
              oldPath: action.old_path,
              newPath: action.new_path,
            });
          }
          return {
            status: action.old_path && action.new_path ? 'renamed' : 'error',
            path: action.new_path ?? '',
            error:
              action.old_path && action.new_path
                ? undefined
                : 'Both old_path and new_path are required',
          } as const;
        }
        default:
          return {
            status: 'error',
            error: 'Unsupported memory command',
          };
      }
    },
  });
