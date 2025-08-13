FROM helpa-base:latest as base

# Copy source and install all dependencies
FROM base as app
WORKDIR /app/ws-relay
RUN pnpm install --frozen-lockfile
COPY ws-relay/tsconfig.json ./
COPY ws-relay/src ./src

# Development stage
FROM app as dev
ENV NODE_ENV=development
CMD ["pnpm", "start:dev"]

# Production build stage
FROM app as prod-build
ENV NODE_ENV=production
RUN pnpm build
# Deploy production-ready package
RUN pnpm --prod deploy /prod/ws-relay

# Production runtime stage - minimal image
FROM node:18-alpine as prod
WORKDIR /app
# Copy the deployed package with only production dependencies
COPY --from=prod-build /prod/ws-relay ./
CMD ["node", "build/index.js"]