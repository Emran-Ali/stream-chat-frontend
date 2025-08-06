# Build stage
FROM node:22-slim AS build-stage

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (without setting NODE_ENV=production)
RUN npm install

# Copy source code and environment
COPY . .
COPY .env .env

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production-stage

# Copy built assets
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Test nginx
RUN nginx -t

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]