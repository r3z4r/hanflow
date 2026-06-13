# syntax=docker/dockerfile:1

# ---- Base: enable Corepack for pinned pnpm version ----
FROM node:22-alpine AS base
RUN corepack enable

# ---- Build stage: install all deps and build the SvelteKit app ----
FROM base AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# SvelteKit's $env/static/private inlines these at build time, so they must
# be *defined* (even as empty strings) for `pnpm build` to succeed. Pass real
# values with --build-arg if a build needs them baked in; otherwise the app
# reads the actual secrets from the runtime environment via adapter-node.
# NOTE: this list only covers vars imported from $env/static/private — it is
# NOT the full runtime configuration surface. See .env.example for that.
# Database
ARG DATABASE_URL=""
# Auth.js
ARG AUTH_SECRET=""
ARG AUTH_TRUST_HOST=""
# OAuth providers
ARG GITHUB_CLIENT_ID=""
ARG GITHUB_CLIENT_SECRET=""
ARG GOOGLE_CLIENT_ID=""
ARG GOOGLE_CLIENT_SECRET=""
# Cache
ARG REDIS_URL=""
# LLM providers
ARG ANTHROPIC_API_KEY=""
ARG GOOGLE_GENERATIVE_AI_API_KEY=""
ENV DATABASE_URL=${DATABASE_URL} \
	AUTH_SECRET=${AUTH_SECRET} \
	AUTH_TRUST_HOST=${AUTH_TRUST_HOST} \
	GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID} \
	GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET} \
	GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
	GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET} \
	REDIS_URL=${REDIS_URL} \
	ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
	GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}

RUN pnpm build

# ---- Production stage: install prod deps only and run the built server ----
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["node", "build/index.js"]
