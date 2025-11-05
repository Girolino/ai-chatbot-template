import type {
  ConversationMessage,
  MemoryProvider,
  WorkingMemory,
} from '@ai-sdk-tools/memory';
import type { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const toChatId = (chatId: string): Id<'chats'> => chatId as Id<'chats'>;
const toProjectId = (projectId: string): Id<'projects'> =>
  projectId as Id<'projects'>;

export class ConvexMemoryProvider implements MemoryProvider {
  constructor(
    private readonly convex: ConvexHttpClient,
    private readonly options: {
      chatId?: string;
      projectId?: string;
      userId: string;
    },
  ) {}

  async getWorkingMemory({
    scope,
    chatId,
  }: {
    scope: 'chat' | 'user';
    chatId?: string;
    userId?: string;
  }): Promise<WorkingMemory | null> {
    const resolvedChatId = chatId ?? this.options.chatId;
    const resolvedProjectId = this.options.projectId;

    const response = await this.convex.query(api.memory.getWorkingMemory, {
      scope,
      chatId: resolvedChatId ? toChatId(resolvedChatId) : undefined,
      projectId: resolvedProjectId ? toProjectId(resolvedProjectId) : undefined,
    });

    if (!response) {
      return null;
    }

    return {
      content: response.content,
      updatedAt: new Date(response.updatedAt),
    };
  }

  async updateWorkingMemory({
    scope,
    content,
    chatId,
  }: {
    scope: 'chat' | 'user';
    content: string;
    chatId?: string;
  }) {
    await this.convex.mutation(api.memory.updateWorkingMemory, {
      scope,
      content,
      chatId: chatId ? toChatId(chatId) : this.options.chatId ? toChatId(this.options.chatId) : undefined,
      projectId: this.options.projectId
        ? toProjectId(this.options.projectId)
        : undefined,
    });
  }

  async saveMessage?(_message: ConversationMessage): Promise<void>;
}
