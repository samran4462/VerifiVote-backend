FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 3001

# Start the NestJS application
CMD ["node", "dist/main.js"]
