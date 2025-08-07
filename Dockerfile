# Build stage
FROM node:22-slim AS build-stage

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Node options for memory
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --verbose

# Copy source code
COPY . .

# Copy environment file
COPY .env .env

# Debug: Show environment and config
RUN echo "=== Environment Variables ===" && \
    cat .env && \
    echo "=== Node Version ===" && \
    node --version && \
    echo "=== NPM Version ===" && \
    npm --version

# Build with timeout and debugging
RUN timeout 300 npm run build --verbose || exit 1

# Verify build
RUN ls -la dist/ && echo "Build successful"

# Production stage
FROM nginx:alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]