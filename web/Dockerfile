FROM helpa-base:latest as builder

COPY web/package.json ./
# Install ALL dependencies (including dev) for build
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist

COPY web/ .

ARG API_HOST
ARG TWITCH_APP_CLIENT_ID
ENV API_HOST=$API_HOST
ENV TWITCH_APP_CLIENT_ID=$TWITCH_APP_CLIENT_ID

RUN pnpm clean && pnpm build

FROM helpa-base:latest as dev
ENV NODE_ENV=development

# Need to redeclare ARGs in each stage to use them
ARG API_HOST
ARG TWITCH_APP_CLIENT_ID
ENV API_HOST=$API_HOST
ENV TWITCH_APP_CLIENT_ID=$TWITCH_APP_CLIENT_ID

COPY web/package.json ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --shamefully-hoist
COPY web/ .
CMD ["pnpm", "start"]

FROM helpa-base:latest as prod
ENV NODE_ENV=production
# Only install serve for production
RUN npm install -g serve
# Copy built static files from builder
COPY --from=builder /app/build ./build
CMD ["serve", "-s", "./build"]