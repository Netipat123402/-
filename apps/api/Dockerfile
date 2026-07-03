# ============================================================================
# ROS API (NestJS) — multi-stage production image (MR-02)
# Build context = repo root:  docker build -f apps/api/Dockerfile -t ros-api .
# ============================================================================

# ---- base: debian-slim + openssl (Prisma engine ต้องการ openssl) ----
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---- deps: ติดตั้ง dependency ทั้ง workspace จาก lockfile (reproducible) ----
FROM base AS deps
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json        apps/api/package.json
COPY apps/web-admin/package.json  apps/web-admin/package.json
COPY apps/web-public/package.json apps/web-public/package.json
COPY db/package.json              db/package.json
RUN npm ci

# ---- build: generate prisma client + nest build → dist ----
FROM deps AS build
COPY db/        db/
COPY apps/api/  apps/api/
RUN npx prisma generate --schema db/prisma/schema.prisma
RUN npm run build -w @ros/api

# ---- runtime: เฉพาะของที่ต้องใช้รัน ----
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000
# node_modules มี prisma client ที่ generate แล้ว (.prisma/client + @prisma/client)
COPY --from=build /app/node_modules        ./node_modules
COPY --from=build /app/apps/api/dist        ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# db/ ไว้รัน migrate deploy (compose: service "migrate")
COPY --from=build /app/db                   ./db
COPY --from=build /app/package.json          ./package.json

WORKDIR /app/apps/api
# uploads = bind/volume (durable จนกว่า MR-04 ย้ายไป MinIO) — main.ts สร้างโฟลเดอร์เองตอนบูต
EXPOSE 4000
# ตรวจสุขภาพในตัว (compose จะมี healthcheck ซ้ำอีกชั้น)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main.js"]
