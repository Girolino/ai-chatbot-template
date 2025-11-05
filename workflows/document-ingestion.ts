import { createAdminConvexClient } from '@/lib/convex/server';
import { internal } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { head } from '@vercel/blob';
import { createHash } from 'crypto';
import type { FunctionReference } from 'convex/server';

type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;

const EMBEDDING_DIMENSION = 1536;
const DEFAULT_CHUNK_SIZE = 1800;
const DEFAULT_CHUNK_OVERLAP = 200;
const MIN_SPLIT_OFFSET = 400;

type DocumentIngestionInput = {
  documentId: string;
  projectId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
};

type PreparedChunk = {
  chunkId: string;
  text: string;
  embedding: number[];
  tokenCount: number;
};

export async function documentIngestionWorkflow(input: DocumentIngestionInput) {
  'use workflow';

  await markDocumentProcessing(input);

  try {
    const file = await downloadDocument(input);
    const text = await extractTextContent({
      buffer: file.buffer,
      mimeType: file.mimeType,
      filename: input.filename,
    });

    if (!text || text.trim().length === 0) {
      throw new Error('Uploaded document does not contain usable textual content.');
    }

    const chunks = await createDocumentChunks({
      text,
      projectId: input.projectId,
      documentId: input.documentId,
    });

    if (chunks.length === 0) {
      throw new Error('Unable to generate text chunks from the uploaded document.');
    }

    await persistChunks({
      projectId: input.projectId,
      documentId: input.documentId,
      chunks,
    });

    await markDocumentReady(input);
  } catch (error) {
    await markDocumentError({
      ...input,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown failure during document processing.',
    });
    throw error;
  }
}

async function markDocumentProcessing(input: DocumentIngestionInput) {
  'use step';

  const convex = createAdminConvexClient();
  await convex.mutation(
    internal.documents.internalUpdateStatus as unknown as FunctionReference<'mutation'>,
    {
      documentId: input.documentId as Id<'projectDocuments'>,
      status: 'processing',
      error: undefined,
      processingStartedAt: Date.now(),
    },
  );
}

async function downloadDocument(input: DocumentIngestionInput) {
  'use step';

  const blobToken =
    process.env.BLOB__READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    throw new Error('BLOB__READ_WRITE_TOKEN não configurado.');
  }

  const metadata = await head(input.storageKey, { token: blobToken });
  const response = await fetch(metadata.downloadUrl);

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar o arquivo (${response.status} ${response.statusText}).`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: metadata.contentType ?? input.mimeType ?? 'application/octet-stream',
  };
}

async function extractTextContent({
  buffer,
  mimeType,
  filename,
}: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}) {
  'use step';

  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime.startsWith('text/')) {
    return buffer.toString('utf-8');
  }

  if (normalizedMime === 'application/json') {
    try {
      const json = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(json, null, 2);
    } catch {
      throw new Error('Failed to parse the uploaded JSON document.');
    }
  }

  if (normalizedMime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
    const pdfModule = await import('pdf-parse');
    const parsePdf: PdfParseFn =
      (pdfModule as { default?: PdfParseFn }).default ??
      (pdfModule as unknown as PdfParseFn);
    const { text } = await parsePdf(buffer);
    return text;
  }

  throw new Error(
    `Unsupported file type "${mimeType}". Please upload plain text, Markdown, JSON, or PDF files.`,
  );
}

async function createDocumentChunks({
  text,
  projectId,
  documentId,
}: {
  text: string;
  projectId: string;
  documentId: string;
}): Promise<PreparedChunk[]> {
  'use step';

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const chunks: PreparedChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + DEFAULT_CHUNK_SIZE, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const lastParagraphBreak = slice.lastIndexOf('\n\n');
      const lastSentenceBreak = slice.lastIndexOf('. ');
      const candidateBreaks = [lastParagraphBreak, lastSentenceBreak].filter(
        (index) => index > MIN_SPLIT_OFFSET,
      );
      if (candidateBreaks.length > 0) {
        end = start + Math.max(...candidateBreaks) + 1;
      }
    }

    const chunkText = normalized.slice(start, end).trim();
    if (chunkText.length > 0) {
      const embedding = buildLocalEmbedding(chunkText);
      const chunkId = createHash('sha256')
        .update(`${projectId}:${documentId}:${chunks.length}:${chunkText}`)
        .digest('hex')
        .slice(0, 32);
      chunks.push({
        chunkId,
        text: chunkText,
        embedding,
        tokenCount: estimateTokenCount(chunkText),
      });
    }

    if (end === normalized.length) {
      break;
    }

    start = Math.max(0, end - DEFAULT_CHUNK_OVERLAP);
  }

  return chunks;
}

async function persistChunks({
  projectId,
  documentId,
  chunks,
}: {
  projectId: string;
  documentId: string;
  chunks: PreparedChunk[];
}) {
  'use step';

  const convex = createAdminConvexClient();
  await convex.mutation(
    internal.embeddings.replaceDocumentChunks as unknown as FunctionReference<'mutation'>,
    {
      projectId: projectId as Id<'projects'>,
      documentId: documentId as Id<'projectDocuments'>,
      chunks: chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        text: chunk.text,
        embedding: chunk.embedding,
        tokenCount: chunk.tokenCount,
      })),
    },
  );
}

async function markDocumentReady(input: DocumentIngestionInput) {
  'use step';

  const convex = createAdminConvexClient();
  await convex.mutation(
    internal.documents.internalUpdateStatus as unknown as FunctionReference<'mutation'>,
    {
      documentId: input.documentId as Id<'projectDocuments'>,
      status: 'ready',
      error: undefined,
      processedAt: Date.now(),
    },
  );
}

async function markDocumentError({
  documentId,
  error,
}: DocumentIngestionInput & { error: string }) {
  'use step';

  const convex = createAdminConvexClient();
  await convex.mutation(
    internal.documents.internalUpdateStatus as unknown as FunctionReference<'mutation'>,
    {
      documentId: documentId as Id<'projectDocuments'>,
      status: 'error',
      error,
    },
  );
}

function buildLocalEmbedding(text: string): number[] {
  const vector = new Float64Array(EMBEDDING_DIMENSION);
  const tokens =
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean) ?? [];

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = Math.abs(hash) % EMBEDDING_DIMENSION;
    vector[index] += 1;
  }

  const magnitude = Math.hypot(...vector);
  if (magnitude === 0) {
    return Array.from(vector);
  }

  for (let i = 0; i < vector.length; i += 1) {
    vector[i] /= magnitude;
  }

  return Array.from(vector);
}

function hashToken(token: string) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

function estimateTokenCount(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, words.length);
}
