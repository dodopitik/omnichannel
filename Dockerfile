# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps

# Install all dependencies
RUN npm ci

# Generate Prisma client
RUN cd packages/database && npm run db:generate

# Build API using turbo
RUN npm run build -- --filter=@omnichannel/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy packages
COPY --from=builder /app/packages ./packages

# Copy node_modules (includes all workspace deps)
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3001

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command
CMD ["node", "apps/api/dist/main.js"]
