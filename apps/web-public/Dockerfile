# ============================================================================
# ROS web-public (Next.js 14, SSR/ISR) — production image (MR-02)
# Build context = repo root:  docker build -f apps/web-public/Dockerfile -t ros-web-public .
# ============================================================================
FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json        apps/api/package.json
COPY apps/web-admin/package.json  apps/web-admin/package.json
COPY apps/web-public/package.json apps/web-public/package.json
COPY db/package.json              db/package.json
RUN npm ci

# ---- build (next build) ----
FROM deps AS build
COPY apps/web-public/ apps/web-public/
# client form เรียก public API; SSR fetch ใช้ API_BASE_INTERNAL (ภายใน compose network)
ARG NEXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
ARG API_BASE_INTERNAL=http://api:4000/api/v1
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV API_BASE_INTERNAL=$API_BASE_INTERNAL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @ros/web-public

# ---- runtime (next start) ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules      ./node_modules
COPY --from=build /app/package.json       ./package.json
COPY --from=build /app/apps/web-public    ./apps/web-public
WORKDIR /app/apps/web-public
EXPOSE 3000
CMD ["npm", "run", "start"]
