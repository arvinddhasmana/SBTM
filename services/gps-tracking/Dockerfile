# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma and enable pnpm via corepack
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and tsconfig
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (shamefully-hoist for TypeScript compatibility)
RUN pnpm install --shamefully-hoist

# Copy prisma schema for client generation
COPY prisma ./prisma

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN pnpm exec tsc

# Stage 2: Production
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma runtime and enable pnpm via corepack
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN pnpm install --prod --shamefully-hoist

# Copy prisma client from builder (prisma CLI is devDependency, not needed at runtime)
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3002

# Set default port
ENV PORT=3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER node

# Start application
CMD ["node", "dist/index.js"]
