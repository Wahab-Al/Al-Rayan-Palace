# ==========================================
# Build stage
# ==========================================
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and compile TypeScript
COPY . .
RUN npm run build


# ==========================================
# Production runtime stage
# ==========================================
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled application from build stage
COPY --from=build /app/dist ./dist

# Run the application with non-root privileges
USER node

# Check application and database readiness
HEALTHCHECK --interval=30s \
  --timeout=5s \
  --start-period=60s \
  --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '5000') + '/api/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

# Default application port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server.js"]
