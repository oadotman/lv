# =====================================================
# PRODUCTION DOCKERFILE FOR CALLIQ
# Optimized for Debian deployment on Datalix
# =====================================================

# Stage 1: Dependencies
FROM node:20-bullseye-slim AS deps
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Stage 2: Builder
FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install all dependencies for build
RUN npm install

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:20-bullseye-slim AS runner
WORKDIR /app

# Install security updates and necessary packages
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r calliq && useradd -r -g calliq calliq

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application
COPY --from=builder --chown=calliq:calliq /app/public ./public
COPY --from=builder --chown=calliq:calliq /app/.next/standalone ./
COPY --from=builder --chown=calliq:calliq /app/.next/static ./.next/static

# Switch to non-root user
USER calliq

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]
