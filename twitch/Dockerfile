FROM helpa-base:latest as base

COPY pnpm-lock.yaml ./
COPY twitch/package.json ./
COPY lib/helpa-api-client ../lib/helpa-api-client
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY twitch/src /app/src
CMD ["pnpm", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
COPY twitch/src /app/src
CMD ["pnpm", "start"]