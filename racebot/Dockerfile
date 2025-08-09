FROM node:18-alpine as base

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files for dependency caching
COPY racebot/package.json ./

# Install dependencies without workspace (standalone mode)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

COPY racebot/ .

# Build the typescript files
RUN pnpm build

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
CMD ["pnpm", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
COPY --from=base /app/build ./build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
CMD ["pnpm", "start"]
