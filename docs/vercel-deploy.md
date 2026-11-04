# Vercel Deployment

## Required Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```env
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=...
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
ADMIN_BASIC_USER=creativelab.co.th@gmail.com
ADMIN_BASIC_PASSWORD=<strong unique password>
YOUTUBE_API_KEY=
GITHUB_TOKEN=
```

`DATABASE_URL` should be the Prisma Postgres connection string from the Prisma/Vercel integration.

## Deploy Flow

1. Connect this GitHub repo to Vercel.
2. Add the environment variables above.
3. Deploy.
4. Run schema push once from your local machine or Vercel CLI:

```bash
pnpm db:push
pnpm db:seed
```

Do not run `db:push` automatically during every Vercel build. Builds should generate Prisma Client and build Next.js only.

## Protected Routes

In production, these routes require Basic Auth:

- `/admin/*`
- `/data-pulls`
- `/api/ingest/*`
- `/api/export`

If `ADMIN_BASIC_PASSWORD` is left as `change-this-before-deploy`, protected routes return `503`.
