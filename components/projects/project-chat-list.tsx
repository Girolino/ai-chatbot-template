'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FolderIcon, MoreHorizontalIcon, PlusIcon } from 'lucide-react';
import { Shimmer } from '@/components/ai-elements/shimmer';

type ProjectChatSummary = Doc<'chats'>;

const FALLBACK_TITLE = 'Untitled chat';

type ProjectChatListProps = {
  project: Doc<'projects'>;
  activeChatId: Id<'chats'> | null;
  onCreateChat: (projectId: Id<'projects'>) => Promise<void>;
  onSelectChat: (selection: {
    chatId: Id<'chats'>;
    clientId: string;
    projectId: Id<'projects'> | null;
    title?: string | null;
  }) => void;
  onMoveChat: (options: {
    chatId: Id<'chats'>;
    clientId?: string;
    projectId?: Id<'projects'> | null;
  }) => Promise<void>;
  projects: Doc<'projects'>[];
};

export function ProjectChatList({
  project,
  activeChatId,
  onCreateChat,
  onSelectChat,
  onMoveChat,
  projects,
}: ProjectChatListProps) {
  const chats = useQuery(api.chats.list, { projectId: project._id }) as ProjectChatSummary[] | undefined;

  const chatsByUpdated = useMemo(() => {
    if (!chats) return [];
    return [...chats].sort((a, b) => (b.lastMessageAt ?? b.updatedAt) - (a.lastMessageAt ?? a.updatedAt));
  }, [chats]);

  const projectsById = useMemo(() => new Map(projects.map((item) => [item._id, item])), [projects]);

  const handleSelectChat = (chat: ProjectChatSummary) => {
    onSelectChat({
      chatId: chat._id,
      clientId: chat.clientId ?? chat._id,
      projectId: chat.projectId ?? null,
      title: chat.title,
    });
  };

  const handleMoveChat = async (chat: ProjectChatSummary, destination?: Id<'projects'> | null) => {
    await onMoveChat({
      chatId: chat._id,
      clientId: chat.clientId ?? chat._id,
      projectId: destination ?? null,
    });
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="border-b px-8 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              {project.description || 'Organize conversations, documents and retrieval memories for this project.'}
            </p>
          </div>
          <Button
            onClick={() => onCreateChat(project._id)}
            className="inline-flex items-center gap-2"
          >
            <PlusIcon className="size-4" />
            New chat in {project.name}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {chatsByUpdated.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">No chats yet in {project.name}.</p>
              <p>Start a conversation or move an existing chat into this project.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onCreateChat(project._id)}
              >
                <PlusIcon className="mr-2 size-4" />
                New chat in {project.name}
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {chatsByUpdated.map((chat) => {
              const isActive = activeChatId === chat._id;
              const lastUpdated = chat.lastMessageAt ?? chat.updatedAt;
              const projectLabel = chat.projectId ? projectsById.get(chat.projectId)?.name : null;
              const isGeneratingTitle =
                chat.titleStatus === 'pending' || chat.titleStatus === 'generating';
              return (
                <li key={chat._id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectChat(chat)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectChat(chat);
                      }
                    }}
                    className={cn(
                      'group flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition',
                      isActive
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-transparent bg-muted/40 hover:border-muted hover:bg-muted/30',
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 truncate text-sm font-semibold text-foreground">
                          {isGeneratingTitle ? (
                            <Shimmer as="span" className="block w-full truncate">
                              Generating title…
                            </Shimmer>
                          ) : (
                            <span className="block truncate">
                              {chat.title?.trim() || FALLBACK_TITLE}
                            </span>
                          )}
                        </div>
                        {projectLabel ? (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            <FolderIcon className="size-3" />
                            {projectLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        Continue this conversation or start a new topic inside the project.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTimestamp(lastUpdated)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Chat actions"
                            className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FolderIcon className="mr-2 size-4" />
                              <span>Move to project</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onSelect={() => handleMoveChat(chat, null)}>
                                <span className="ml-6 text-sm">No project</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {projects.map((projectOption) => (
                                <DropdownMenuItem
                                  key={projectOption._id}
                                  onSelect={() => handleMoveChat(chat, projectOption._id)}
                                >
                                  <FolderIcon className="mr-2 size-4" />
                                  <span>{projectOption.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: number | undefined) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
