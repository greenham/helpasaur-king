FROM helpa-base:latest as base

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files for dependency caching
COPY discord/package.json ./
# Copy the shared library
COPY lib/helpa-api-client /lib/helpa-api-client

# Install dependencies without workspace (standalone mode)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    npm install -g nodemon && \
    pnpm install --shamefully-hoist
CMD ["pnpm", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
# Copy only production dependencies from base
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --shamefully-hoist
COPY discord/src /app/src
CMD ["pnpm", "start"]