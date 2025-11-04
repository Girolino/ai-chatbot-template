'use client';

import { AIDevtools } from '@ai-sdk-tools/devtools';
import { Provider as ChatStoreProvider } from '@ai-sdk-tools/store';
import { ReactNode } from 'react';

type AppProvidersProps = {
  children: ReactNode;
};

const shouldRenderDevtools =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ChatStoreProvider>
      {children}
      {shouldRenderDevtools ? (
        <AIDevtools
          maxEvents={500}
          config={{
            position: 'bottom',
            streamCapture: {
              enabled: true,
              endpoint: '/api/chat',
              autoConnect: true,
            },
          }}
        />
      ) : null}
    </ChatStoreProvider>
  );
}
