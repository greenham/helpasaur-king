FROM node:18-alpine as base

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files for dependency caching
COPY web/package.json ./

# Install dependencies without workspace (standalone mode)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

COPY web/ .

ARG API_HOST
ENV API_HOST=$API_HOST

ARG TWITCH_APP_CLIENT_ID
ENV TWITCH_APP_CLIENT_ID=$TWITCH_APP_CLIENT_ID

# Build the app
RUN pnpm clean && pnpm build

FROM base as dev
ENV NODE_ENV=development
CMD ["pnpm", "start"]

FROM base as prod
ENV NODE_ENV=production
COPY --from=base /app/build ./build
RUN npm install -g serve
CMD ["serve", "-s", "./build"]
