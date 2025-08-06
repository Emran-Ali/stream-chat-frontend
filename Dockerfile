# Build stage
FROM node:22-alpine AS build-stage

WORKDIR /app

# Set environment variables for optimization
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package*.json ./

# Install dependencies with timeout and no optional deps
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund --silent

# Copy source code
COPY . .

# Copy environment variables
COPY .env .env

# Build with timeout (10 minutes max)
RUN timeout 600 npm run build || exit 1

# Production stage
FROM nginx:alpine AS production-stage

# Copy built assets from build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]