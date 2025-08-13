FROM helpa-base:latest as base
WORKDIR /workspace

# Development stage - with all dependencies including devDependencies
FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "ws-relay..."
COPY ws-relay/tsconfig.json ./ws-relay/
COPY ws-relay/src ./ws-relay/src
WORKDIR /app
RUN ln -s /workspace/ws-relay/node_modules ./node_modules
COPY ws-relay/src ./src
CMD ["pnpm", "start:dev"]

# Production build stage
FROM base as prod-build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "ws-relay..."
COPY ws-relay/tsconfig.json ./ws-relay/
COPY ws-relay/src ./ws-relay/src
WORKDIR /workspace/ws-relay
RUN pnpm build
# Deploy production-ready package
WORKDIR /workspace
RUN pnpm --filter ws-relay --prod deploy /prod/ws-relay

# Production runtime stage - minimal image
FROM node:18-alpine as prod
WORKDIR /app
ENV NODE_ENV=production
# Copy the deployed package with only production dependencies
COPY --from=prod-build /prod/ws-relay ./
CMD ["node", "build/index.js"]