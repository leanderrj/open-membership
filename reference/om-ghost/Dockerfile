# syntax=docker/dockerfile:1.7

# --- builder -----------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# better-sqlite3 needs build tools on alpine
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY service ./service
COPY shared ./shared
COPY worker ./worker
COPY test ./test

RUN npm run build \
  && npm prune --omit=dev

# --- runner ------------------------------------------------------------
FROM node:20-alpine AS runner

RUN apk add --no-cache tini

# Run as a non-root user. node:20-alpine ships with a `node` user (uid 1000).
WORKDIR /app
RUN mkdir -p /app/state && chown -R node:node /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

ENV NODE_ENV=production
ENV PORT=4000
ENV OM_STATE_DIR=/app/state

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/service/index.js"]
