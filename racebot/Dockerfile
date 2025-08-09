FROM helpa-base:latest as base

COPY racebot/package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

COPY racebot/ .

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
