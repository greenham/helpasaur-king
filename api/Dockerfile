FROM helpa-base:latest as base

COPY pnpm-lock.yaml ./
COPY api/package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY api/tsconfig.json ./
COPY api/src /app/src
CMD ["pnpm", "start:dev"]

FROM base as prod-build
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY api/tsconfig.json ./
COPY api/src /app/src
RUN pnpm build

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
COPY --from=prod-build /app/dist /app/dist
CMD ["pnpm", "start"]