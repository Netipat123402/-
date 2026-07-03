# ============================================================================
# ROS web-admin (Next.js 14, CSR) — production image (MR-02)
# Build context = repo root:  docker build -f apps/web-admin/Dockerfile -t ros-web-admin .
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
COPY apps/web-admin/ apps/web-admin/
# fallback base; client จริงเรียก API ผ่าน window.location:4000 ตอน runtime
ARG NEXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @ros/web-admin

# ---- runtime (next start) ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/node_modules     ./node_modules
COPY --from=build /app/package.json      ./package.json
COPY --from=build /app/apps/web-admin    ./apps/web-admin
WORKDIR /app/apps/web-admin
EXPOSE 3001
CMD ["npm", "run", "start"]
