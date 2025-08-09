FROM helpa-base:latest as builder

COPY racebot/package.json ./
# Install ALL dependencies (including dev) for build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

COPY racebot/ .
RUN pnpm build

FROM helpa-base:latest as base

COPY racebot/package.json ./

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY racebot/ .
CMD ["pnpm", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
# Copy built artifacts from builder stage
COPY --from=builder /app/build ./build
CMD ["pnpm", "start"]