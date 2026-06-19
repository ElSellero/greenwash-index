# Always-on worker image for the AIS yacht collector (scripts/ais-collector.ts).
# It is a websocket *client* — no HTTP server, no ports, no Next build. Replaces
# the detached local PowerShell supervisor: Fly's restart policy is the watchdog.
FROM node:24-slim

WORKDIR /app

# tsx is a devDependency, so we need the full install (not --omit=dev).
COPY package.json package-lock.json ./
RUN npm ci

# Only the code the collector actually imports (src/lib/{db,ingest}, schema).
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src

# Foreground process; AISSTREAM_API_KEY + DATABASE_URL come from `fly secrets`.
CMD ["npm", "run", "ais"]
