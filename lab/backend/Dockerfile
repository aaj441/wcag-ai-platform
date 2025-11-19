# Multi-stage build for production
# Final image: ~50MB (distroless)

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM gcr.io/distroless/nodejs20-debian12

# Non-root user
USER nonroot:nonroot

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"]

# Start server
CMD ["/nodejs/bin/node", "dist/server.js"]
