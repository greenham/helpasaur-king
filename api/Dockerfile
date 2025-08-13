FROM helpa-base:latest as base
WORKDIR /workspace

# Development stage - with all dependencies including devDependencies
FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "api..."
COPY api/tsconfig.json ./api/
COPY api/src ./api/src
WORKDIR /app
RUN ln -s /workspace/api/node_modules ./node_modules
COPY api/src ./src
CMD ["pnpm", "start:dev"]

# Production build stage
FROM base as prod-build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "api..."
COPY api/tsconfig.json ./api/
COPY api/src ./api/src
WORKDIR /workspace/api
RUN pnpm build
# Deploy production-ready package
WORKDIR /workspace
RUN pnpm --filter api --prod deploy /prod/api

# Production runtime stage - minimal image
FROM node:18-alpine as prod
WORKDIR /app
ENV NODE_ENV=production
# Copy the deployed package with only production dependencies
COPY --from=prod-build /prod/api ./
CMD ["node", "dist/index.js"]