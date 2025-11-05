import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const EMBEDDING_DIMENSION = 1536;

export default defineSchema({
  chats: defineTable({
    userId: v.string(),
    projectId: v.optional(v.id('projects')),
    clientId: v.optional(v.string()),
    title: v.optional(v.string()),
    titleStatus: v.optional(v.string()),
    titleGeneratedAt: v.optional(v.number()),
    lastMessageAt: v.number(),
    settings: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_project', ['projectId'])
    .index('by_user_updatedAt', ['userId', 'updatedAt'])
    .index('by_user_lastMessageAt', ['userId', 'lastMessageAt'])
    .index('by_project_updatedAt', ['projectId', 'updatedAt'])
    .index('by_client', ['clientId']),

  messages: defineTable({
    chatId: v.id('chats'),
    userId: v.string(),
    projectId: v.optional(v.id('projects')),
    messageId: v.optional(v.string()),
    role: v.string(),
    parts: v.array(v.any()),
    providerMetadata: v.optional(v.any()),
    usage: v.optional(v.any()),
    toolCalls: v.optional(v.array(v.any())),
    status: v.optional(v.string()),
    version: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_chat', ['chatId'])
    .index('by_chat_createdAt', ['chatId', 'createdAt'])
    .index('by_chat_messageId', ['chatId', 'messageId'])
    .index('by_project', ['projectId'])
    .index('by_user', ['userId']),

  artifacts: defineTable({
    chatId: v.id('chats'),
    toolCallId: v.optional(v.string()),
    type: v.string(),
    payload: v.any(),
    status: v.string(),
    version: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_chat', ['chatId'])
    .index('by_chat_type', ['chatId', 'type']),

  memories: defineTable({
    userId: v.string(),
    scope: v.string(),
    projectId: v.optional(v.id('projects')),
    chatId: v.optional(v.id('chats')),
    data: v.string(),
    updatedAt: v.number(),
  })
    .index('by_user_scope', ['userId', 'scope'])
    .index('by_project_scope', ['projectId', 'scope'])
    .index('by_chat', ['chatId']),

  memoryFiles: defineTable({
    chatId: v.id('chats'),
    projectId: v.optional(v.id('projects')),
    path: v.string(),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_chat', ['chatId'])
    .index('by_chat_path', ['chatId', 'path'])
    .index('by_project', ['projectId'])
    .index('by_project_path', ['projectId', 'path']),

  toolUsage: defineTable({
    chatId: v.id('chats'),
    userId: v.string(),
    projectId: v.optional(v.id('projects')),
    toolName: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    status: v.string(),
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_chat_tool', ['chatId', 'toolName']),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
    memberIds: v.array(v.string()),
    settings: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_updatedAt', ['updatedAt']),

  projectDocuments: defineTable({
    projectId: v.id('projects'),
    userId: v.string(),
    storageKey: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    checksum: v.optional(v.string()),
    status: v.string(),
    error: v.optional(v.string()),
    processingStartedAt: v.optional(v.number()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_status', ['projectId', 'status'])
    .index('by_status', ['status'])
    .index('by_storage_key', ['storageKey']),

  projectMemory: defineTable({
    projectId: v.id('projects'),
    kind: v.string(),
    content: v.any(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project_kind', ['projectId', 'kind'])
    .index('by_project_updatedAt', ['projectId', 'updatedAt']),

  projectChunks: defineTable({
    projectId: v.id('projects'),
    documentId: v.id('projectDocuments'),
    chunkId: v.string(),
    text: v.string(),
    embedding: v.array(v.float64()),
    tokenCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_document', ['documentId'])
    .index('by_project_chunk', ['projectId', 'chunkId'])
    .vectorIndex('by_project_embedding', {
      vectorField: 'embedding',
      dimensions: EMBEDDING_DIMENSION,
      filterFields: ['projectId'],
    }),
});
