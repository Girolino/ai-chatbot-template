import { artifact } from '@ai-sdk-tools/artifacts';
import { z } from 'zod';

const statusSchema = z.enum(['idle', 'running', 'complete', 'error']);

export const chatRunArtifact = artifact(
  'chat-run',
  z.object({
    status: statusSchema.default('idle'),
    model: z.string().nullable().default(null),
    webSearch: z.boolean().default(false),
    extendedThinking: z.boolean().default(false),
    startedAt: z.string().nullable().default(null),
    finishedAt: z.string().nullable().default(null),
    totalTokens: z.number().nullable().default(null),
    inputTokens: z.number().nullable().default(null),
    outputTokens: z.number().nullable().default(null),
    toolsUsed: z.array(z.string()).default([]),
    error: z.string().nullable().default(null),
  }),
);

export type ChatRunArtifactData = z.infer<typeof chatRunArtifact.schema>;

export const textNoteArtifact = artifact(
  'text-note',
  z.object({
    title: z.string().min(1, 'Title is required').default('Note'),
    body: z.string().min(1, 'Body is required'),
    tone: z
      .enum(['default', 'success', 'warning', 'info'])
      .default('default')
      .describe('Optional tone to hint the UI styling.'),
  }),
);

export type TextNoteArtifactData = z.infer<typeof textNoteArtifact.schema>;
