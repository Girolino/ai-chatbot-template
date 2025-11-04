'use client';

import { useArtifact } from '@ai-sdk-tools/artifacts/client';
import { textNoteArtifact } from '@/lib/ai/artifacts';
import { cn } from '@/lib/utils';

type TextNotePanelProps = {
  className?: string;
};

const toneStyles: Record<string, string> = {
  default: 'border-border bg-card/70',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100',
  success:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
  warning:
    'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100',
};

export function TextNotePanel({ className }: TextNotePanelProps) {
  const { data } = useArtifact(textNoteArtifact);

  if (!data) {
    return null;
  }

  const toneClass = toneStyles[data.tone] ?? toneStyles.default;

  return (
    <article
      className={cn(
        'mb-4 rounded-xl border p-4 text-sm shadow-sm backdrop-blur-sm transition-colors',
        toneClass,
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-base">{data.title}</h2>
      </header>
      <div className="mt-2 whitespace-pre-wrap leading-relaxed text-sm">
        {data.body}
      </div>
    </article>
  );
}
