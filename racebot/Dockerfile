FROM helpa-base:latest as base
WORKDIR /workspace

# Development stage - with all dependencies including devDependencies
FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "racebot..."
COPY racebot/tsconfig.json ./racebot/
COPY racebot/src ./racebot/src
WORKDIR /app
RUN ln -s /workspace/racebot/node_modules ./node_modules
COPY racebot/src ./src
CMD ["pnpm", "start:dev"]

# Production build stage
FROM base as prod-build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "racebot..."
COPY racebot/tsconfig.json ./racebot/
COPY racebot/src ./racebot/src
WORKDIR /workspace/racebot
RUN pnpm build
# Deploy production-ready package
WORKDIR /workspace
RUN pnpm --filter racebot --prod deploy /prod/racebot

# Production runtime stage - minimal image
FROM node:18-alpine as prod
WORKDIR /app
ENV NODE_ENV=production
# Copy the deployed package with only production dependencies
COPY --from=prod-build /prod/racebot ./
CMD ["node", "build/index.js"]