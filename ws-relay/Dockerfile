FROM helpa-base:latest as base

COPY pnpm-lock.yaml ./
COPY ws-relay/package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY ws-relay/tsconfig.json ./
COPY ws-relay/src /app/src
CMD ["pnpm", "start:dev"]

FROM base as prod-build
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY ws-relay/tsconfig.json ./
COPY ws-relay/src /app/src
RUN pnpm build

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
COPY --from=prod-build /app/dist /app/dist
CMD ["pnpm", "start"]