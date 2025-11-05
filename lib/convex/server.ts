import { ConvexHttpClient } from 'convex/browser';
import { api, internal } from '@/convex/_generated/api';

const publicConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const serverConvexUrl = process.env.CONVEX_URL ?? publicConvexUrl;

if (!publicConvexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is required.');
}

if (!serverConvexUrl) {
  throw new Error('CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) environment variable is required.');
}

export function createConvexClient(authToken?: string) {
  const client = new ConvexHttpClient(publicConvexUrl!);
  if (authToken) {
    client.setAuth(authToken);
  }
  return client;
}

export function createAdminConvexClient() {
  const adminKey = process.env.CONVEX_ADMIN_KEY;
  if (!adminKey) {
    throw new Error('CONVEX_ADMIN_KEY environment variable is required for admin access.');
  }

  const client = new ConvexHttpClient(serverConvexUrl!);
  (client as unknown as { setAdminAuth: (token: string) => void }).setAdminAuth(adminKey);
  return client;
}

export { api, internal };
