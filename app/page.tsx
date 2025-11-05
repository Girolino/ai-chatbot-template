'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { UserButton } from '@clerk/nextjs';
import type {
  ReasoningUIPart,
  SourceUrlUIPart,
  TextUIPart,
  UIDataTypes,
  UITools,
  UIMessage,
  UIMessagePart,
} from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Action, Actions } from '@/components/ai-elements/actions';
import { CopyIcon, GlobeIcon, ImageIcon, PlusIcon, RefreshCcwIcon, TimerIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { TextNotePanel } from '@/components/ai-elements/text-note-panel';
import {
  ANTHROPIC_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
} from '@/lib/ai/models';
import { useChat, useChatActions } from '@ai-sdk-tools/store';
import { Response } from '@/components/ai-elements/response';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { ProjectSidebar } from '@/components/projects/project-sidebar';
import { ProjectDocumentsPanel } from '@/components/projects/project-documents-panel';
import { ProjectChatList } from '@/components/projects/project-chat-list';
import { nanoid } from 'nanoid';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

type MenuToggleItemProps = {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
};

const MenuToggleItem = ({ icon: Icon, label, checked, onToggle }: MenuToggleItemProps) => (
  <CommandItem
    value={label.toLowerCase()}
    onSelect={() => onToggle(!checked)}
    onPointerDown={(event) => event.preventDefault()}
  >
    <div className="flex w-full items-center gap-2">
      <Icon className="size-4" />
      <span className="flex-1 text-sm">{label}</span>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onToggle}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  </CommandItem>
);

const MenuAttachmentItem = () => {
  const attachments = usePromptInputAttachments();

  return (
    <CommandItem
      value="add-photos-or-files"
      onSelect={() => attachments.openFileDialog()}
      onPointerDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center gap-2">
        <ImageIcon className="size-4" />
        <span className="text-sm">Add photos or files</span>
      </div>
    </CommandItem>
  );
};

const models = ANTHROPIC_MODELS;

type MessageWithParts = UIMessage & {
  parts: UIMessagePart<UIDataTypes, UITools>[];
};

type ActiveChat = {
  chatId: Id<'chats'> | null;
  clientId: string;
  projectId: Id<'projects'> | null;
  title?: string | null;
};

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(DEFAULT_ANTHROPIC_MODEL);
  const [webSearch, setWebSearch] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [projects, setProjects] = useState<Doc<'projects'>[]>([]);
  const [selectedProject, setSelectedProject] = useState<Doc<'projects'> | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);

  const moveChatMutation = useMutation(api.chats.move);

  const chatActions = useChatActions();
  const { reset, setMessages, setId, setStatus, clearError } = chatActions;

  const { messages, sendMessage, status, regenerate } = useChat({ id: activeChat?.clientId });
  const menuActive = webSearch || extendedThinking;

  const handleProjectsLoaded = useCallback((loaded: Doc<'projects'>[]) => {
    setProjects(loaded);
    setSelectedProject((current) => {
      if (!current) return current;
      const updated = loaded.find((project) => project._id === current._id);
      return updated ?? null;
    });
  }, []);

  const selectedProjectId = selectedProject?._id ?? null;

  const chatMessages = useQuery(
    api.messages.list,
    activeChat?.chatId ? { chatId: activeChat.chatId } : ('skip' as const),
  ) as Doc<'messages'>[] | undefined;

  const handleProjectSelect = useCallback(
    (project: Doc<'projects'> | null) => {
      setSelectedProject(project);
      setActiveChat(null);
      setInput('');
      reset();
    },
    [reset],
  );

  const handleChatSelect = useCallback(
    (selection: ActiveChat) => {
      setActiveChat(selection);
      if (selection.projectId) {
        const project = projects.find((candidate) => candidate._id === selection.projectId);
        setSelectedProject(project ?? null);
      } else {
        setSelectedProject(null);
      }
    },
    [projects],
  );

  const handleCreateChat = useCallback(
    async ({ projectId }: { projectId?: Id<'projects'> | null }) => {
      const clientId = nanoid();
      const project =
        projectId != null
          ? projects.find((candidate) => candidate._id === projectId) ?? null
          : null;

      setSelectedProject(project ?? null);
      setActiveChat({
        chatId: null,
        clientId,
        projectId: projectId ?? null,
      });
      setInput('');
      reset();
    },
    [projects, reset],
  );

  const handleMoveChat = useCallback(
    async ({
      chatId,
      projectId,
    }: {
      chatId: Id<'chats'>;
      clientId?: string;
      projectId?: Id<'projects'> | null;
    }) => {
      try {
        await moveChatMutation({ chatId, projectId: projectId ?? undefined });
        if (activeChat?.chatId === chatId) {
          setActiveChat((previous) =>
            previous ? { ...previous, projectId: projectId ?? null } : previous,
          );
          const project =
            projectId != null
              ? projects.find((candidate) => candidate._id === projectId) ?? null
              : null;
          setSelectedProject(project ?? null);
        }
      } catch (error) {
        console.error('Failed to move chat', error);
      }
    },
    [moveChatMutation, activeChat, projects],
  );

  const handleChatDeleted = useCallback(
    (chatId: Id<'chats'>) => {
      if (activeChat?.chatId === chatId) {
        setActiveChat(null);
        setInput('');
        reset();
      }
    },
    [activeChat, reset],
  );

  useEffect(() => {
    if (!activeChat) {
      reset();
      return;
    }
    setId(activeChat.clientId);
  }, [activeChat, reset, setId]);

  useEffect(() => {
    if (!activeChat || !chatMessages) return;
    if (status === 'streaming') return;
    const nextMessages = chatMessages.map(mapConvexMessageToUI);
    setMessages(nextMessages as UIMessage[]);
    setStatus('ready');
    clearError();
  }, [activeChat, chatMessages, status, setMessages, setStatus, clearError]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files,
      },
      {
        body: {
          id: activeChat?.clientId,
          model,
          webSearch,
          extendedThinking,
          projectId: activeChat?.projectId ?? undefined,
        },
      },
    );
    setInput('');
  };

  const typedMessages = messages as MessageWithParts[];
  const conversationEmpty = typedMessages.length === 0 && status !== 'streaming';
  const activeChatId = activeChat ? activeChat.chatId : null;

  const headerTitle = useMemo(() => {
    if (activeChat) {
      return activeChat.title?.trim() || 'Untitled chat';
    }
    if (selectedProject) {
      return selectedProject.name;
    }
    return 'Workspace';
  }, [activeChat, selectedProject]);

  const statusLine = useMemo(() => {
    if (activeChat) {
      return activeChat.projectId
        ? 'Chat powered by project context and memories.'
        : '';
    }
    if (selectedProject) {
      return `Working inside "${selectedProject.name}"`;
    }
    return '';
  }, [activeChat, selectedProject]);

  const breadcrumbItems = useMemo(() => {
    if (activeChat) {
      const items: { label: string; isCurrent?: boolean }[] = [];
      if (selectedProject) {
        items.push({ label: selectedProject.name });
      }
      const chatLabel = activeChat.chatId
        ? headerTitle
        : 'New chat';
      items.push({ label: chatLabel, isCurrent: true });
      return items;
    }
    if (selectedProject) {
      return [{ label: selectedProject.name, isCurrent: true }];
    }
    return [{ label: 'Workspace', isCurrent: true }];
  }, [activeChat, selectedProject, headerTitle]);

  return (
    <SidebarProvider defaultOpen>
      <ProjectSidebar
        selectedProjectId={selectedProjectId}
        selectedChatId={activeChatId}
        onProjectsLoaded={handleProjectsLoaded}
        onSelectProject={handleProjectSelect}
        onSelectChat={handleChatSelect}
        onCreateChat={handleCreateChat}
        onMoveChat={handleMoveChat}
        onDeleteChat={handleChatDeleted}
      />
      <SidebarInset className="flex h-svh flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-3">
            <div className="min-w-0 flex flex-col gap-1">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;
                    return (
                      <Fragment key={`${item.label}-${index}`}>
                        <BreadcrumbItem className={!isLast && breadcrumbItems.length > 1 ? 'hidden md:block' : undefined}>
                          {isLast || !item.isCurrent ? (
                            isLast ? (
                              <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
                            ) : (
                              <span className="truncate text-muted-foreground">{item.label}</span>
                            )
                          ) : (
                            <BreadcrumbLink asChild>
                              <span className="truncate text-muted-foreground">{item.label}</span>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {index < breadcrumbItems.length - 1 ? (
                          <BreadcrumbSeparator className="hidden md:block" />
                        ) : null}
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              {statusLine ? (
                <p className="text-xs text-muted-foreground line-clamp-1">{statusLine}</p>
              ) : null}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <PromptModelSelector model={model} onChange={setModel} />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <ProjectDocumentsPanel project={selectedProject} />

        <div className="flex flex-1 flex-col overflow-hidden">
          {activeChat ? (
            <>
              <div className="flex-1 overflow-hidden px-4 pb-4 md:px-6">
                <Conversation className="h-full">
                  <ConversationContent>
                    <TextNotePanel />
                    {conversationEmpty ? (
                      <EmptyChatState />
                    ) : (
                      typedMessages.map((message) => (
                        <ChatMessageBlock
                          key={message.id}
                          message={message}
                          isLast={typedMessages.at(-1)?.id === message.id}
                          status={status}
                          onRegenerate={regenerate}
                        />
                      ))
                    )}
                    {status === 'submitted' && <Loader />}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
              </div>

              <div className="border-t bg-background px-4 py-4 md:px-6">
                <PromptInput onSubmit={handleSubmit} className="w-full" globalDrop multiple>
                  <PromptInputHeader>
                    <PromptInputAttachments>
                      {(attachment) => <PromptInputAttachment data={attachment} />}
                    </PromptInputAttachments>
                  </PromptInputHeader>
                  <PromptInputBody>
                    <PromptInputTextarea
                      onChange={(event) => setInput(event.target.value)}
                      value={input}
                      placeholder={
                        selectedProject
                          ? `Ask a question or request an action for ${selectedProject.name}…`
                          : 'Ask a question…'
                      }
                    />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger
                          aria-pressed={menuActive}
                          aria-label="Open tools menu"
                          variant={menuActive ? 'default' : 'ghost'}
                        />
                        <PromptInputActionMenuContent>
                          <Command className="w-64 gap-1 p-1">
                            <CommandInput placeholder="Search menu" />
                            <CommandList>
                              <CommandGroup heading="Tools">
                                <MenuAttachmentItem />
                                <MenuToggleItem
                                  icon={TimerIcon}
                                  label="Extended thinking"
                                  checked={extendedThinking}
                                  onToggle={(value) => setExtendedThinking(value)}
                                />
                              </CommandGroup>
                              <CommandSeparator />
                              <CommandGroup heading="Search">
                                <MenuToggleItem
                                  icon={GlobeIcon}
                                  label="Web search"
                                  checked={webSearch}
                                  onToggle={(value) => setWebSearch(value)}
                                />
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                      <PromptInputButton
                        aria-pressed={extendedThinking}
                        aria-label="Toggle extended thinking"
                        title="Extended thinking"
                        variant={extendedThinking ? 'default' : 'ghost'}
                        onClick={() => setExtendedThinking((prev) => !prev)}
                      >
                        <TimerIcon size={16} />
                        <span>Think</span>
                      </PromptInputButton>
                    </PromptInputTools>
                    <PromptInputSubmit disabled={!input && !status} status={status} />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </>
          ) : selectedProject ? (
            <ProjectChatList
              project={selectedProject}
              activeChatId={activeChatId}
              onCreateChat={(projectId) => handleCreateChat({ projectId })}
              onSelectChat={handleChatSelect}
              onMoveChat={handleMoveChat}
              projects={projects}
            />
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted-foreground">
              <div>
                <p className="text-base font-medium text-foreground">Welcome to your workspace.</p>
                <p className="mt-2">
                  Start a new chat or create a project to organize conversations, documents and
                  retrieval memories.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button onClick={() => handleCreateChat({ projectId: null })}>
                    <PlusIcon className="mr-2 size-4" />
                    New chat
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

function mapConvexMessageToUI(message: Doc<'messages'>): UIMessage {
  return {
    id: message.messageId ?? (message._id as string),
    role: message.role as UIMessage['role'],
    parts: (message.parts ?? []) as UIMessagePart<UIDataTypes, UITools>[],
    metadata: message.providerMetadata,
  } as UIMessage;
}

type ChatMessageBlockProps = {
  message: MessageWithParts;
  isLast: boolean;
  status: string;
  onRegenerate: () => void;
};

type AnyMessagePart = UIMessagePart<UIDataTypes, UITools>;

const isSourceUrlPart = (part: AnyMessagePart): part is SourceUrlUIPart =>
  part.type === 'source-url';

const isTextPart = (part: AnyMessagePart): part is TextUIPart =>
  part.type === 'text';

const isReasoningPart = (part: AnyMessagePart): part is ReasoningUIPart =>
  part.type === 'reasoning';

const ChatMessageBlock = ({ message, isLast, status, onRegenerate }: ChatMessageBlockProps) => (
  <div>
    {message.role === 'assistant' &&
    message.parts.some(isSourceUrlPart) ? (
      <Sources>
        <SourcesTrigger
          count={message.parts.filter(isSourceUrlPart).length}
        />
        {message.parts
          .filter(isSourceUrlPart)
          .map((part, index) => (
            <SourcesContent key={`${message.id}-${index}`}>
              <Source href={part.url} title={part.title ?? part.url} />
            </SourcesContent>
          ))}
      </Sources>
    ) : null}
    {message.parts.map((part, index) => {
      switch (part.type) {
        case 'text': {
          if (!isTextPart(part)) {
            return null;
          }
          const textContent = part.text;
          return (
            <Fragment key={`${message.id}-${index}`}>
              <Message from={message.role}>
                <MessageContent>
                  <Response>{textContent}</Response>
                </MessageContent>
              </Message>
              {message.role === 'assistant' && isLast && (
                <Actions className="mt-2">
                  <Action onClick={onRegenerate} label="Retry">
                    <RefreshCcwIcon className="size-3" />
                  </Action>
                  <Action
                    onClick={() => navigator.clipboard.writeText(textContent)}
                    label="Copy"
                  >
                    <CopyIcon className="size-3" />
                  </Action>
                </Actions>
              )}
            </Fragment>
          );
        }
        case 'reasoning':
          return (
            <Reasoning
              key={`${message.id}-${index}`}
              className="w-full"
              isStreaming={status === 'streaming' && index === message.parts.length - 1 && isLast}
            >
              <ReasoningTrigger />
              <ReasoningContent>
                {isReasoningPart(part) ? part.text : ''}
              </ReasoningContent>
            </Reasoning>
          );
        default:
          return null;
      }
    })}
  </div>
);

const PromptModelSelector = ({
  model,
  onChange,
}: {
  model: string;
  onChange: (value: string) => void;
}) => (
  <PromptInputModelSelect onValueChange={onChange} value={model}>
    <PromptInputModelSelectTrigger>
      <PromptInputModelSelectValue placeholder="Select model" />
    </PromptInputModelSelectTrigger>
    <PromptInputModelSelectContent>
      {models.map((modelOption) => (
        <PromptInputModelSelectItem key={modelOption.id} value={modelOption.id}>
          {modelOption.label}
        </PromptInputModelSelectItem>
      ))}
    </PromptInputModelSelectContent>
  </PromptInputModelSelect>
);

const EmptyChatState = () => (
  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
    <div className="space-y-2">
      <p>No messages yet.</p>
      <p>Ask something about your project or provide instructions for the assistant.</p>
    </div>
  </div>
);

export default ChatBotDemo;
