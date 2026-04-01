# ─── Stage 1: install workspace dependencies ───────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

COPY libs/common/package.json                    ./libs/common/
COPY apps/admin-dashboard/package.json           ./apps/admin-dashboard/
COPY apps/parent-app/web/package.json            ./apps/parent-app/web/
COPY services/api-gateway/package.json           ./services/api-gateway/
COPY services/compliance-management/package.json ./services/compliance-management/
COPY services/emergency-alerts/package.json      ./services/emergency-alerts/
COPY services/gps-tracking/package.json          ./services/gps-tracking/
COPY services/student-management/package.json    ./services/student-management/
COPY services/student-presence/package.json      ./services/student-presence/
COPY services/video-service/package.json         ./services/video-service/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: build ─────────────────────────────────────────────────────────
FROM deps AS builder

COPY libs/common/ ./libs/common/
RUN pnpm --filter @sbtm/common run build

COPY services/student-management/ ./services/student-management/

RUN pnpm --filter student-management run build

RUN pnpm deploy --filter student-management --prod /deploy
RUN rm -rf /deploy/dist && cp -r /workspace/services/student-management/dist /deploy/dist

# ─── Stage 3: production image ──────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /deploy ./

ENV NODE_ENV=production
EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER node
CMD ["node", "dist/main"]
