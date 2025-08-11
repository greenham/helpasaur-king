FROM helpa-base:latest as base

COPY pnpm-lock.yaml ./
COPY discord/package.json ./
COPY tsconfig.base.json /tsconfig.base.json
COPY lib/helpa-api-client /lib/helpa-api-client
RUN cd /lib/helpa-api-client && npm install && npm run build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY tsconfig.base.json /
COPY discord/tsconfig.json ./
COPY discord/src /app/src
RUN pnpm run build
CMD ["pnpm", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
COPY tsconfig.base.json /
COPY discord/tsconfig.json ./
COPY discord/src /app/src
RUN pnpm run build
CMD ["pnpm", "start"]