FROM node:18-alpine

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (skip postinstall for now)
RUN npm install --ignore-scripts

# Rebuild bcrypt for Alpine Linux
RUN npm rebuild bcrypt --build-from-source

# Copy source code
COPY . .

# Build TypeScript (optional - we'll run dev mode which uses ts-node)
RUN npm run build || true

# Expose port
EXPOSE 3001

# Default command (can be overridden)
CMD ["npm", "run", "dev"]

