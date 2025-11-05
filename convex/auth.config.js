const domain =
  process.env.CLERK_JWT_ISSUER_DOMAIN ??
  process.env.CLERK_FRONTEND_API ??
  process.env.CLERK_FRONTEND_API_URL;

if (!domain) {
  throw new Error(
    'Missing CLERK_JWT_ISSUER_DOMAIN environment variable for Convex authentication. ' +
    'This should be the Issuer URL from your Clerk JWT template.',
  );
}

export default {
  providers: [
    {
      domain,
      applicationID: 'convex',
    },
  ],
};
