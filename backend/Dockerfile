# --- Build stage ---
FROM node:20-bullseye-slim AS build

WORKDIR /app

COPY package*.json ./

RUN npm install
# Copy source and build
COPY . ./
RUN npm run build


# --- Runtime stage ---
FROM node:20-bullseye-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

COPY --from=build /app/package*.json ./


COPY --from=build /app/dist ./dist
# Your app loads template/assets from src at runtime; include them
COPY --from=build /app/src ./src

# Ensure writable dirs exist (or mount as volumes)
RUN mkdir -p /app/uploads /app/output

EXPOSE 5000

CMD ["node", "dist/index.js"]


