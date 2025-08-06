# Build stage - Use debian instead of alpine
FROM node:22-slim AS build-stage

WORKDIR /app

# Install build dependencies for debian
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Copy environment variables
COPY .env .env

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ || exit 1

# Production stage - Keep nginx alpine for smaller size
FROM nginx:alpine AS production-stage

# Copy built assets from build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Test nginx configuration
RUN nginx -t

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]