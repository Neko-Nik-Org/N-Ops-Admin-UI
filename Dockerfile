# syntax=docker/dockerfile:1

# ── build: no config is baked in here ──
# API_BASE_URL / TURNSTILE_SITE_KEY are read when the container starts (docker/write-env.mjs),
# so the same image runs against test or production depending on docker-compose.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── runtime ──
FROM node:22-alpine AS runtime
WORKDIR /app
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist
# no-cache for env.js and index.html, long cache for hashed assets
COPY docker/serve.json ./dist/serve.json
COPY docker/write-env.mjs ./write-env.mjs

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/ || exit 1

# write dist/env.js from the environment, then hand off to the static server
CMD ["sh", "-c", "node /app/write-env.mjs /app/dist/env.js && exec serve -s dist -l 8080"]
