# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN cd packages/database && npm run db:generate

# Build API
RUN npm run build -- --filter=@omnichannel/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/generated ./packages/database/generated
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start application
CMD ["node", "apps/api/dist/main.js"]
