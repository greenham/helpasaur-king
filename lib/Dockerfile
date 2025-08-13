FROM node:18-alpine as builder

# Install common global packages
RUN npm install -g pnpm@8 nodemon

# Set up common working directory
WORKDIR /app

# Install common system dependencies for debugging and health checks
RUN apk add --no-cache curl wget

# Create common directories that services might need
RUN mkdir -p /app/src /app/build /app/dist

# Add a health check script location
RUN mkdir -p /usr/local/bin

# Copy and build all library packages
COPY . /lib
WORKDIR /lib

# Build @helpasaur/types
WORKDIR /lib/types
RUN pnpm install && pnpm build

# Build @helpasaur/helpa-api-client
WORKDIR /lib/helpa-api-client
RUN pnpm install && pnpm build

# Return to app directory
WORKDIR /app

# This image serves as a base with common tools pre-installed
# Services extending this image get:
# - pnpm@8 and nodemon pre-installed
# - Common directories created
# - curl and wget for health checks
# - Pre-built library packages in /lib