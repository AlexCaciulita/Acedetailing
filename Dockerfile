FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy server and API handlers
COPY server.js ./
COPY api/ ./api/

# Copy built static assets
COPY dist/ ./dist/

# Set environment
ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/ || exit 1

CMD ["node", "server.js"]
