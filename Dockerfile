FROM node:20-slim

# Install C++ compiler tools for native modules (node-gyp / better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and backend package manifests
COPY package.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy application code
COPY . .

# Build TypeScript backend
RUN cd backend && npm run build

# Default environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start server
CMD ["node", "backend/dist/server.js"]
