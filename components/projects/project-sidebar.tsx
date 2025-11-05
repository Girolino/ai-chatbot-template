'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useConvexAuth } from 'convex/react';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
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
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (projects) {
      onProjectsLoaded?.(projects);
    }
  }, [projects, onProjectsLoaded]);

  useEffect(() => {
    if (isSearchActive) {
      const timer = window.setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
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
    return chats.filter((chat) => (chat.title ?? '').toLowerCase().includes(term));
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
    if (!nextTitle) return;

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

  const toggleSearch = () => {
    setSearchActive((previous) => {
      if (previous) {
        setSearchQuery('');
      }
      return !previous;
    });
  };

  return (
    <>
      <Sidebar className="bg-sidebar text-sidebar-foreground" collapsible="icon">
        <SidebarHeader className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase text-muted-foreground/70">
                Workspace
              </span>
              <span className="text-sm font-semibold tracking-tight">Projects &amp; Chats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      void onCreateChat({ projectId: selectedProjectId ?? null });
                    }}
                  >
                    <PlusIcon className="size-4" />
                    <span className="sr-only">New chat</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  Start a new chat
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={isSearchActive ? 'default' : 'ghost'}
                    onClick={toggleSearch}
                    aria-pressed={isSearchActive}
                  >
                    <SearchIcon className="size-4" />
                    <span className="sr-only">Toggle chat search</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  Search chats
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {isSearchActive ? (
            <SidebarInput
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats…"
              className="pl-8"
            />
          ) : null}
        </SidebarHeader>

        <SidebarContent className="gap-2">
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarGroupAction type="button" onClick={() => setProjectDialogOpen(true)}>
                  <FolderPlusIcon className="size-4" />
                  <span className="sr-only">Create project</span>
                </SidebarGroupAction>
              </TooltipTrigger>
              <TooltipContent side="bottom">New project</TooltipContent>
            </Tooltip>
            <SidebarGroupContent>
              {projects && projects.length > 0 ? (
                <SidebarMenu>
                  {projects.map((project) => {
                    const isActive = selectedProjectId === project._id;
                    return (
                      <SidebarMenuItem key={project._id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleSelectProject(project)}
                          className="justify-between"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FolderIcon className="size-4" />
                            <span className="truncate">{project.name}</span>
                          </span>
                        </SidebarMenuButton>
                        <SidebarMenuBadge>{formatProjectCount(chats, project._id)}</SidebarMenuBadge>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              ) : (
                <div className="mt-2 rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  <p className="mb-3">Organize conversations by creating your first project.</p>
                  <Button
                    size="sm"
                    onClick={() => setProjectDialogOpen(true)}
                    className="w-full justify-center"
                  >
                    <FolderPlusIcon className="mr-2 size-4" />
                    Create project
                  </Button>
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              {filteredChats && filteredChats.length > 0 ? (
                <SidebarMenu>
                  {filteredChats.map((chat) => {
                    const isActive = selectedChatId === chat._id;
                    const project = chat.projectId ? projectsById.get(chat.projectId) : null;
                    const isGeneratingTitle =
                      chat.titleStatus === 'pending' || chat.titleStatus === 'generating';
                    const titleNode = isGeneratingTitle ? (
                      <Shimmer as="span" className="truncate">
                        Generating title…
                      </Shimmer>
                    ) : (
                      <span className="truncate">{chat.title?.trim() || CHAT_FALLBACK_TITLE}</span>
                    );

                    return (
                      <SidebarMenuItem key={chat._id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleSelectChat(chat)}
                          className="flex-col items-start gap-1 pr-10"
                        >
                          {titleNode}
                          {project ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <FolderIcon className="size-3" />
                              {project.name}
                            </span>
                          ) : null}
                        </SidebarMenuButton>

                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction
                              showOnHover={!isActive}
                              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                              <MoreHorizontalIcon className="size-4" />
                              <span className="sr-only">Chat actions</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="bottom">
                            <DropdownMenuItem onSelect={() => openRenameDialog(chat)}>
                              <PencilIcon className="mr-2 size-4" />
                              <span>Rename chat</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
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
                              <DropdownMenuPortal>
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
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              ) : (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  {searchQuery ? 'No chats match your search.' : 'Send a message to start a chat.'}
                </p>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      <Dialog open={isProjectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
            <DialogDescription>
              Projects group chats, documents, and memories under a shared workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="project-name">
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
              <label className="text-sm font-medium" htmlFor="project-description">
                Description
              </label>
              <Textarea
                id="project-description"
                rows={3}
                placeholder="Optional context to help the assistant inside this project."
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectDialogOpen(false)}
              disabled={isCreatingProject}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreatingProject || !projectName.trim()}>
              {isCreatingProject ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRenameDialogOpen}
        onOpenChange={(open) => {
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
            <label className="text-sm font-medium" htmlFor="chat-title">
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
              type="button"
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
        onOpenChange={(open) => {
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
              This action permanently removes the chat, including all messages, artifacts, and
              memories.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setChatBeingDeleted(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChat} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatProjectCount(chats: Doc<'chats'>[] | undefined, projectId: Id<'projects'>) {
  if (!chats || chats.length === 0) return '0';
  const count = chats.filter((chat) => chat.projectId === projectId).length;
  return count.toString();
}
