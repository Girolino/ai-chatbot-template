'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createConvexClient, api } from '@/lib/convex/server';
import type { Id } from '@/convex/_generated/dataModel';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';

type UploadTokenRequest = {
  filename: string;
  mimeType?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;

  const authResult = await auth();
  if (!authResult.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = (await request.json()) as UploadTokenRequest;
  if (!body?.filename || typeof body.filename !== 'string') {
    return new Response('Filename is required.', { status: 400 });
  }

  const convexProjectId = projectId as Id<'projects'>;
  const convexToken = await authResult.getToken({ template: 'convex' });
  const convex = createConvexClient(convexToken ?? undefined);

  // Ensure the user has access to the project.
  await convex.query(api.projects.get, { projectId: convexProjectId });

  const blobToken =
    process.env.BLOB__READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return new Response('Blob token is not configured.', { status: 500 });
  }

  const pathname = [
    'projects',
    convexProjectId,
    `${crypto.randomUUID()}-${sanitizeFilename(body.filename)}`,
  ].join('/');

  const clientToken = await generateClientTokenFromReadWriteToken({
    token: blobToken,
    pathname,
    allowedContentTypes: body.mimeType ? [body.mimeType] : undefined,
  });

  return NextResponse.json({
    token: clientToken,
    pathname,
  });
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '-');
}
