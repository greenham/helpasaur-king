FROM helpa-base:latest as base

COPY runnerwatcher/package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY runnerwatcher/src /app/src
CMD ["pnpm", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
COPY runnerwatcher/src /app/src
CMD ["pnpm", "start"]