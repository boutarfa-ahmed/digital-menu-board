# bookworm-slim (glibc), not alpine: Prisma's query engine binary has known
# compatibility issues with musl libc that cost more debugging time than the
# extra ~100MB image size is worth for a single-service backend.
FROM node:20-bookworm-slim

WORKDIR /app

# Prisma's engine binaries dynamically link against openssl; bookworm-slim
# doesn't ship it by default and the server crashes at boot without it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# `prisma generate` runs here, not at build time: prisma.config.ts requires
# DATABASE_URL to be set, and it deliberately isn't available during `docker
# build` (.env is excluded from the image via .dockerignore — a secret has no
# business being baked into a layer). It only exists once the container
# starts and docker-compose injects the real one.
#
# `migrate deploy` (not `migrate dev`) applies pending migrations without
# prompting and without generating new ones — the only migrate subcommand
# safe to run unattended on every container start. Both commands are no-ops
# once the client/schema are already current.
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node src/server.js"]
