# Hostinger deployment

The Compose project is named `almaali-university` and runs as an isolated
project on the VPS.

## GitHub Actions settings

Add these repository secrets under **Settings → Secrets and variables → Actions**:

- `HOSTINGER_API_KEY`
- `DATABASE_URL` — the current Render PostgreSQL external connection URL, including its TLS option.
- `JWT_SECRET` — a random 64-character hexadecimal value.

Add this repository variable:

- `HOSTINGER_VM_ID` — the numeric ID shown in the VPS overview URL.
- `HOSTINGER_DEPLOY_ENABLED` — set to `true` only after the proxy and secrets are ready.

The workflow deploys on pushes to `main` after it is enabled. It can also be
started manually from the Actions page.

## Existing services and domain routing

The web and API containers bind only to the VPS loopback interface:

- Web: `127.0.0.1:18080`
- API: `127.0.0.1:13000`

Configure the VPS's existing reverse proxy to route `uni.novanoai.online` to
`127.0.0.1:18080` and `api.uni.novanoai.online` to `127.0.0.1:13000`, with
HTTPS certificates for both hostnames. The Compose project intentionally does
not claim ports 80 or 443, which may already serve other sites on this VPS.

Point the two DNS names to the VPS only after both proxy routes and HTTPS have
been verified. Keep the current Render services available until cutover checks
pass.

## Database

The first deployment connects to the existing Render PostgreSQL database using
its external connection URL. This keeps current accounts, courses, and
registrations available while the application is tested on Hostinger. Keep the
Render database and services active during this stage. Moving PostgreSQL onto
the VPS is a separate backup-and-restore step; do not change `DATABASE_URL` to
a new empty database before importing the existing data.

Prisma migrations run before the API starts. The existing database retains its
current accounts; no demo seed data is run during deployment.
