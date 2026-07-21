# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /workspace

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mini-saas/package.json apps/mini-saas/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter @backend-learning/mini-saas... --frozen-lockfile

COPY apps/mini-saas apps/mini-saas

RUN pnpm --filter @backend-learning/mini-saas build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @backend-learning/mini-saas --prod deploy --legacy /prod/mini-saas

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=build --chown=node:node /prod/mini-saas ./

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
