'use client';

import { useArtifact } from '@ai-sdk-tools/artifacts/client';
import type { ComponentType } from 'react';
import { AlertTriangleIcon, CheckIcon, Loader2Icon } from 'lucide-react';
import { chatRunArtifact } from '@/lib/ai/artifacts';
import { cn } from '@/lib/utils';

type ChatRunStatusProps = {
  className?: string;
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  running: 'Running',
  complete: 'Complete',
  error: 'Error',
};

const STATUS_ICON: Record<string, ComponentType<{ className?: string }>> = {
  idle: Loader2Icon,
  running: Loader2Icon,
  complete: CheckIcon,
  error: AlertTriangleIcon,
};

const STATUS_STYLE: Record<string, string> = {
  idle: 'text-muted-foreground',
  running: 'text-primary',
  complete: 'text-emerald-500',
  error: 'text-destructive',
};

export function ChatRunStatus({ className }: ChatRunStatusProps) {
  const { data } = useArtifact(chatRunArtifact);

  if (!data || data.status === 'idle') {
    return null;
  }

  const currentStatus = data.status ?? 'idle';
  const StatusIcon = STATUS_ICON[currentStatus] ?? Loader2Icon;
  const statusLabel = STATUS_LABEL[currentStatus] ?? currentStatus;
  const statusClassName = STATUS_STYLE[currentStatus] ?? STATUS_STYLE.idle;
  const iconClassName = cn(
    'size-4',
    currentStatus === 'running' ? 'animate-spin' : undefined,
  );

  const tokens: Array<{ label: string; value: number | null | undefined }> = [
    { label: 'Total tokens', value: data.totalTokens },
    { label: 'Input tokens', value: data.inputTokens },
    { label: 'Output tokens', value: data.outputTokens },
  ];

  const hasTokenData = tokens.some((token) => typeof token.value === 'number' && !Number.isNaN(token.value));
  const hasTools = Array.isArray(data.toolsUsed) && data.toolsUsed.length > 0;

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border border-border bg-card/60 p-3 text-sm shadow-sm backdrop-blur',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="font-medium text-foreground">
            {data.model ?? '—'}
          </div>
          <div className="text-muted-foreground text-xs">
            <span>Web search: {data.webSearch ? 'on' : 'off'}</span>
            <span className="mx-2">•</span>
            <span>Extended thinking: {data.extendedThinking ? 'on' : 'off'}</span>
          </div>
          <div className="text-muted-foreground text-xs">
            <span>{data.startedAt ? new Date(data.startedAt).toLocaleTimeString() : '—'}</span>
            {data.finishedAt ? (
              <>
                <span className="mx-1 text-muted-foreground">→</span>
                <span>{new Date(data.finishedAt).toLocaleTimeString()}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className={cn('flex items-center gap-2 text-sm font-medium', statusClassName)}>
          <StatusIcon className={iconClassName} aria-hidden />
          <span>{statusLabel}</span>
        </div>
      </div>

      {hasTokenData ? (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          {tokens.map(({ label, value }) => (
            <div key={label} className="rounded border border-border/70 bg-background/60 p-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-medium">
                {typeof value === 'number' && !Number.isNaN(value) ? value.toLocaleString() : '—'}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasTools ? (
        <div className="mt-3 flex flex-wrap gap-1 text-xs">
          {data.toolsUsed.map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-border/70 bg-background/80 px-2 py-0.5 font-medium text-foreground/80"
            >
              {tool}
            </span>
          ))}
        </div>
      ) : null}

      {data.error ? (
        <p className="mt-3 whitespace-pre-wrap text-xs text-destructive">{data.error}</p>
      ) : null}
    </div>
  );
}
