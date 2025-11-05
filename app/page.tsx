import { Suspense } from 'react';
import ChatPageClient from './chat-page-client';
import { ShellSkeleton } from '@/components/skeletons/shell-skeleton';
import { SidebarWorkspaceTitle } from '@/components/projects/sidebar-workspace-title';

export default async function Page() {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <ChatPageClient sidebarHeader={<SidebarWorkspaceTitle />} />
    </Suspense>
  );
}
