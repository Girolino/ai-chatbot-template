git add .; git commit -m '  v0.01.09 feat: tanstack'; git push origin main
git reset --hard; git clean -fd; git checkout dev-branch; git pull origin dev-branch
git reset --hard c2366a1
git push --force origin dev-branch




This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
bunx next dev
```

Other common scripts:

```bash
bunx next build   # production build
bunx next start   # start prod server
bunx eslint       # lint
```
