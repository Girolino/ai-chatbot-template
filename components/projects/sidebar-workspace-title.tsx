'use cache';

export async function SidebarWorkspaceTitle() {
  return (
    <>
      <span className="text-xs font-semibold uppercase text-muted-foreground/70">
        Workspace
      </span>
      <span className="text-sm font-semibold tracking-tight">Projects &amp; Chats</span>
    </>
  );
}
