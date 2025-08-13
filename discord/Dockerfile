FROM helpa-base:latest as base
WORKDIR /workspace

# Development stage - with all dependencies including devDependencies
FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "discord..."
COPY discord/tsconfig.json ./discord/
COPY discord/src ./discord/src
WORKDIR /app
RUN ln -s /workspace/discord/node_modules ./node_modules
COPY discord/src ./src
CMD ["pnpm", "start:dev"]

# Production build stage
FROM base as prod-build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "discord..."
COPY discord/tsconfig.json ./discord/
COPY discord/src ./discord/src
WORKDIR /workspace/discord
RUN pnpm build
# Deploy production-ready package
WORKDIR /workspace
RUN pnpm --filter discord --prod deploy /prod/discord

# Production runtime stage - minimal image
FROM node:18-alpine as prod
WORKDIR /app
ENV NODE_ENV=production
# Copy the deployed package with only production dependencies
COPY --from=prod-build /prod/discord ./
CMD ["node", "dist/bot.js"]