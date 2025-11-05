'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadIcon } from 'lucide-react';
import { put } from '@vercel/blob/client';
import { cn } from '@/lib/utils';

type ProjectDocumentsPanelProps = {
  project: Doc<'projects'> | null;
  className?: string;
};

export function ProjectDocumentsPanel({ project, className }: ProjectDocumentsPanelProps) {
  const documents = useQuery(
    api.documents.list,
    project ? { projectId: project._id } : ('skip' as const),
  );

  if (!project) return null;

  return (
    <div className={cn('border-b bg-muted/30', className)}>
      <div className="px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Knowledge base for {project.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Upload PDFs, Markdown or text files to transform them into searchable memory.
            </p>
          </div>
          <DocumentUploadButton projectId={project._id} />
        </div>

        <ScrollArea className="mt-3 max-h-48 rounded-md border bg-background">
          <div className="divide-y">
            {documents && documents.length > 0 ? (
              documents.map((document: Doc<'projectDocuments'>) => (
                <article
                  key={document._id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">{document.filename}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatBytes(document.size)}</span>
                      <span>{document.mimeType}</span>
                      {document.processedAt ? (
                        <span>
                          Processed {new Date(document.processedAt).toLocaleString()}
                        </span>
                      ) : null}
                      {document.error ? <span className="text-destructive">{document.error}</span> : null}
                    </div>
                  </div>
                  <Badge variant={statusToVariant(document.status)}>{formatStatus(document.status)}</Badge>
                </article>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No documents yet. Upload one to kick off retrieval-augmented responses.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

type DocumentUploadButtonProps = {
  projectId: Id<'projects'>;
};

function DocumentUploadButton({ projectId }: DocumentUploadButtonProps) {
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    try {
      setUploading(true);
      setError(null);
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 10MB limit.`);
        }

        const tokenResponse = await fetch(`/api/projects/${projectId}/upload-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(await tokenResponse.text());
        }

        const { token, pathname } = (await tokenResponse.json()) as {
          token: string;
          pathname: string;
        };

        const uploadResult = await put(pathname, file, {
          access: 'public',
          token,
          multipart: file.size > 4.5 * 1024 * 1024,
        });

        const checksum = await computeSha256(file);

        const registerResponse = await fetch(`/api/projects/${projectId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            storageKey: uploadResult.pathname,
            checksum,
          }),
        });

        if (!registerResponse.ok) {
          throw new Error(await registerResponse.text());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted">
        <UploadIcon className="size-4" />
        <span>{isUploading ? 'Uploading…' : 'Upload documents'}</span>
        <input
          type="file"
          accept=".pdf,.txt,.md,.markdown,.json"
          className="sr-only"
          multiple
          disabled={isUploading}
          onChange={(event) => handleFileSelection(event.target.files)}
        />
      </label>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

function formatStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'ready':
      return 'Ready';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

function statusToVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ready':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

async function computeSha256(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
