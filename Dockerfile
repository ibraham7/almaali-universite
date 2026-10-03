FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY apps/web apps/web

FROM dependencies AS api

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Prisma Client generation does not connect to this placeholder database.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN pnpm --dir apps/api exec prisma generate --config prisma7.config.ts \
    && pnpm --dir apps/api run build

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --config prisma7.config.ts && node dist/main.js"]

FROM dependencies AS web-build

ARG VITE_API_URL=https://api.uni.novanoai.online
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --dir apps/web run build

FROM nginx:1.29-alpine AS web

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
