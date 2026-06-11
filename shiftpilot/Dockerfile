# ShiftPilot — self-contained deployment image.
# Build:  docker build -t shiftpilot .
# Run:    docker run -p 3000:3000 -v shiftpilot-data:/data shiftpilot
# (or simply: docker compose up)

FROM node:22-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first for layer caching. The postinstall hook runs
# `prisma generate`, which needs the schema and prisma.config.ts present.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# The SQLite database lives on a volume so data survives restarts/upgrades.
ENV DATABASE_URL=file:/data/shiftpilot.db
VOLUME /data
EXPOSE 3000

CMD ["sh", "./scripts/docker-start.sh"]
