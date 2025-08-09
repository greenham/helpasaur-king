FROM node:18-alpine as builder

# Install common global packages
RUN npm install -g pnpm@8 nodemon

# Set up common working directory
WORKDIR /app

# Install common system dependencies for debugging and health checks
RUN apk add --no-cache curl wget

# Copy the shared library (available for services that need it)
COPY ./helpa-api-client /lib/helpa-api-client

# Create common directories that services might need
RUN mkdir -p /app/src /app/build /app/dist

# Add a health check script location
RUN mkdir -p /usr/local/bin

# This image serves as a base with common tools pre-installed
# Services extending this image get:
# - pnpm@8 and nodemon pre-installed
# - helpa-api-client library at /lib/helpa-api-client
# - Common directories created
# - curl and wget for health checks