# teamItAppServer

TeamIt backend — **NestJS + TypeScript + Prisma + PostgreSQL + MinIO**.

Phase 1 (current): Auth (JWT), MinIO file upload/retrieval, achievements
calculator. Remaining collections (projects, chats, messages, reviews,
notifications, project requests) arrive in subsequent phases.

## Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose (for Postgres & MinIO)
- Or: local Postgres 16 + MinIO if you prefer not to use Docker

## Setup

```bash
cp .env.example .env   # fill in JWT_SECRET and MinIO creds
npm install
npx prisma generate
```

## Run — docker-compose (recommended)

Spins up server + Postgres + MinIO together.

```bash
docker compose up --build
```

Migrations run automatically on container start (`prisma migrate deploy`).

## Run — local dev

1. Start only the dependencies from compose:

```bash
docker compose up -d postgres minio
```

2. Run migrations and the server:

```bash
npx prisma migrate dev
npm run start:dev
```

Server listens on `http://localhost:5000` (or HTTPS if `SSL_KEY_PATH` /
`SSL_CERT_PATH` are set and the cert files exist).

## Useful scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Nest in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run prisma:migrate` | Create + apply a dev migration |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run lint` / `format` | ESLint / Prettier |

## API (phase 1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | `{ email, password, userName, roles? }` → `{ accessToken, user }` |
| POST | `/auth/login` | public | `{ email, password }` → `{ accessToken, user }` |
| GET | `/auth/me` | Bearer | current user profile |
| POST | `/upload` | public* | `multipart/form-data` with field `file` → `{ id }` |
| GET | `/file/:id` | public* | → `{ url }` (24h presigned) |
| POST | `/achievements/calculate` | Bearer | `{ userId, projects, reviews }` → `{ achievements }` |

\* `/upload` and `/file/:id` stay public for now to preserve bug-compatibility
with the existing mobile `minioService`. They'll be locked down once the
client sends JWT on those requests.

## Environment variables

See [.env.example](.env.example). Required: `DATABASE_URL`, `JWT_SECRET`,
`MINIO_*`, `BUCKET_NAME`.

## Legacy

The previous Express server lives in `server.js.bak` / `firebase.js.bak`
for reference; remove them once you've verified the Nest rewrite works.
`serviceAccountKey.json` is no longer needed — Firebase Admin is gone.
