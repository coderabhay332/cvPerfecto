# --- Build stage ---
FROM node:20-bullseye-slim AS build

WORKDIR /app

# Install dependencies (include dev deps for TypeScript build)
COPY package*.json ./
RUN npm ci --omit=dev=false

# Copy source and build
COPY . ./
RUN npm run build


# --- Runtime stage ---
FROM node:20-bullseye-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

# Copy only what we need at runtime
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

# App code (compiled) and any runtime-needed assets/templates
COPY --from=build /app/dist ./dist
# Your app loads template/assets from src at runtime; include them
COPY --from=build /app/src ./src

# Ensure writable dirs exist (or mount as volumes)
RUN mkdir -p /app/uploads /app/output

EXPOSE 5000

CMD ["node", "dist/index.js"]


