# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json ./
RUN pnpm install

# Stage 2: Build
FROM base AS builder
ARG VITE_API_URL
ARG VITE_MAPTILER_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_MAPTILER_KEY=${VITE_MAPTILER_KEY}
COPY . .
RUN pnpm run build

# Stage 3: Production
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
