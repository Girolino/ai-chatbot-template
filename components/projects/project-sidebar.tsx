'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import {
  FolderIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';
import { Shimmer } from '@/components/ai-elements/shimmer';
type SidebarChatSelection = {
  chatId: Id<'chats'>;
  clientId: string;
  projectId: Id<'projects'> | null;
  title?: string | null;
};

type ProjectSidebarProps = {
  selectedProjectId: Id<'projects'> | null | undefined;
  selectedChatId: Id<'chats'> | null | undefined;
  onProjectsLoaded?: (projects: Doc<'projects'>[]) => void;
  onSelectProject: (project: Doc<'projects'> | null) => void;
  onSelectChat: (selection: SidebarChatSelection) => void;
  onCreateChat: (options: { projectId?: Id<'projects'> | null }) => Promise<void>;
  onMoveChat: (options: {
    chatId: Id<'chats'>;
    clientId?: string;
    projectId?: Id<'projects'> | null;
  }) => Promise<void>;
  onDeleteChat?: (chatId: Id<'chats'>) => void;
};

type SidebarActionProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

const SidebarAction = ({ icon: Icon, label, onClick, disabled }: SidebarActionProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition',
      'text-muted-foreground hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60',
    )}
  >
    <Icon className="size-4" />
    <span>{label}</span>
  </button>
);

type SidebarSectionProps = {
  title: string;
  children: React.ReactNode;
};

const SidebarSection = ({ title, children }: SidebarSectionProps) => (
  <section className="px-3 py-2">
    <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
    <div className="mt-1 space-y-1">{children}</div>
  </section>
);

const CHAT_FALLBACK_TITLE = 'Untitled chat';

export function ProjectSidebar({
  selectedProjectId,
  selectedChatId,
  onProjectsLoaded,
  onSelectProject,
  onSelectChat,
  onCreateChat,
  onMoveChat,
  onDeleteChat,
}: ProjectSidebarProps) {
  const { isAuthenticated } = useConvexAuth();
  const projects = useQuery(
    api.projects.list,
    isAuthenticated ? {} : ('skip' as const),
  ) as Doc<'projects'>[] | undefined;
  const chats = useQuery(
    api.chats.list,
    isAuthenticated ? {} : ('skip' as const),
  ) as Doc<'chats'>[] | undefined;

  const createProject = useMutation(api.projects.create);
  const renameChat = useMutation(api.chats.rename);
  const deleteChat = useMutation(api.chats.remove);
  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreatingProject, setCreatingProject] = useState(false);
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false);
  const [chatBeingRenamed, setChatBeingRenamed] = useState<Doc<'chats'> | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setRenaming] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatBeingDeleted, setChatBeingDeleted] = useState<Doc<'chats'> | null>(null);
  const [isDeleting, setDeleting] = useState(false);

  const [isSearchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (projects) {
      onProjectsLoaded?.(projects);
    }
  }, [projects, onProjectsLoaded]);

  useEffect(() => {
    if (isSearchActive) {
      const timeout = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isSearchActive]);

  const projectsById = useMemo(() => {
    if (!projects) return new Map<Id<'projects'>, Doc<'projects'>>();
    return new Map(projects.map((project) => [project._id, project]));
  }, [projects]);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!searchQuery.trim()) return chats;
    const term = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      const title = chat.title ?? '';
      return title.toLowerCase().includes(term);
    });
  }, [chats, searchQuery]);

  const handleSelectProject = (project: Doc<'projects'> | null) => {
    onSelectProject(project);
  };

  const handleSelectChat = (chat: Doc<'chats'>) => {
    const projectId = chat.projectId ?? null;
    if (projectId) {
      const project = projectsById.get(projectId);
      if (project) {
        onSelectProject(project);
      }
    } else {
      onSelectProject(null);
    }

    onSelectChat({
      chatId: chat._id,
      clientId: chat.clientId ?? chat._id,
      projectId,
      title: chat.title,
    });
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    try {
      setCreatingProject(true);
      await createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      });
      setProjectName('');
      setProjectDescription('');
      setProjectDialogOpen(false);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleMoveChat = async (chat: Doc<'chats'>, projectId?: Id<'projects'> | null) => {
    await onMoveChat({
      chatId: chat._id,
      clientId: chat.clientId ?? chat._id,
      projectId: projectId ?? null,
    });
  };

  const openRenameDialog = (chat: Doc<'chats'>) => {
    setChatBeingRenamed(chat);
    setRenameValue(chat.title?.trim() || '');
    setRenameDialogOpen(true);
  };

  const handleRenameChat = async () => {
    const chat = chatBeingRenamed;
    if (!chat) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      return;
    }
    try {
      setRenaming(true);
      await renameChat({ chatId: chat._id, title: nextTitle });
      setRenameDialogOpen(false);
      setChatBeingRenamed(null);
    } finally {
      setRenaming(false);
    }
  };

  const openDeleteDialog = (chat: Doc<'chats'>) => {
    setChatBeingDeleted(chat);
    setDeleteDialogOpen(true);
  };

  const handleDeleteChat = async () => {
    const chat = chatBeingDeleted;
    if (!chat) return;
    try {
      setDeleting(true);
      await deleteChat({ chatId: chat._id });
      onDeleteChat?.(chat._id);
      setDeleteDialogOpen(false);
      setChatBeingDeleted(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r bg-muted/40">
      <div className="border-b px-3 py-4">
        <SidebarAction
          icon={PlusIcon}
          label="New chat"
          onClick={() => onCreateChat({ projectId: null })}
        />
        <SidebarAction
          icon={SearchIcon}
          label="Search chats"
          onClick={() => setSearchActive((value) => !value)}
        />
      </div>

      <ScrollArea className="flex-1">
        <SidebarSection title="Projects">
          <Dialog open={isProjectDialogOpen} onOpenChange={setProjectDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                <FolderPlusIcon className="size-4" />
                <span>New project</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new project</DialogTitle>
                <DialogDescription>
                  Projects group chats, documents and memories under a shared workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="project-name">
                    Name
                  </label>
                  <Input
                    id="project-name"
                    placeholder="Growth experiments"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="project-description"
                  >
                    Description
                  </label>
                  <Textarea
                    id="project-description"
                    placeholder="Optional context to help the assistant reason inside this project."
                    value={projectDescription}
                    onChange={(event) => setProjectDescription(event.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setProjectDialogOpen(false)}
                  disabled={isCreatingProject}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={isCreatingProject || !projectName}>
                  {isCreatingProject ? 'Creating…' : 'Create project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {projects && projects.length > 0 ? (
            projects.map((project) => {
              const isActive = selectedProjectId === project._id;
              return (
                <div
                  key={project._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectProject(project)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectProject(project);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition outline-none',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-ring'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <FolderIcon className="size-4" />
                    <span className="truncate">{project.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatProjectCount(chats, project._id)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              <p className="mb-3">Organize conversations by creating your first project.</p>
              <Button size="sm" onClick={() => setProjectDialogOpen(true)}>
                <FolderPlusIcon className="mr-2 size-4" />
                Create project
              </Button>
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="Chats">
          {isSearchActive ? (
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats…"
              className="mb-1 h-8"
            />
          ) : null}
          {filteredChats && filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const isActive = selectedChatId === chat._id;
              const project = chat.projectId ? projectsById.get(chat.projectId) : null;
              const isGeneratingTitle =
                chat.titleStatus === 'pending' || chat.titleStatus === 'generating';
              const titleNode = isGeneratingTitle ? (
                <Shimmer as="span" className="truncate">
                  Generating title…
                </Shimmer>
              ) : (
                <span className="truncate">
                  {chat.title?.trim() || CHAT_FALLBACK_TITLE}
                </span>
              );
              return (
                <div
                  key={chat._id}
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
                    'group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition outline-none',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-ring'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring',
                  )}
                >
                  <span className="flex-1 truncate">
                    {titleNode}
                    {project ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <FolderIcon className="size-3" />
                        {project.name}
                      </span>
                    ) : null}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                        <MoreHorizontalIcon className="size-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onSelect={() => openRenameDialog(chat)}>
                        <PencilIcon className="mr-2 size-4" />
                        <span>Rename chat</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => openDeleteDialog(chat)}
                      >
                        <TrashIcon className="mr-2 size-4" />
                        <span>Delete chat</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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
                          {projects?.map((projectOption) => (
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
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {searchQuery ? 'No chats match your search.' : 'Start a conversation to see it here.'}
            </p>
          )}
        </SidebarSection>
      </ScrollArea>

      <Dialog
        open={isRenameDialogOpen}
        onOpenChange={(open: boolean) => {
          setRenameDialogOpen(open);
          if (!open) {
            setChatBeingRenamed(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              Update the chat title to something more descriptive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-foreground" htmlFor="chat-title">
              Title
            </label>
            <Input
              id="chat-title"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false);
                setChatBeingRenamed(null);
                setRenameValue('');
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameChat} disabled={isRenaming || !renameValue.trim()}>
              {isRenaming ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open: boolean) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setChatBeingDeleted(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat</DialogTitle>
            <DialogDescription>
              This action will permanently remove the chat and all associated messages, artifacts,
              and memories. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setChatBeingDeleted(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChat}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function formatProjectCount(chats: Doc<'chats'>[] | undefined, projectId: Id<'projects'>) {
  if (!chats || chats.length === 0) return '0';
  const count = chats.filter((chat) => chat.projectId === projectId).length;
  return count.toString();
}
