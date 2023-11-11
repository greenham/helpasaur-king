FROM node:16-alpine as base

WORKDIR /src
COPY . .

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.yarn to speed up subsequent builds.
# Leverage a bind mounts to package.json and yarn.lock to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile

# Build the typescript files
RUN yarn build

FROM base as dev
ENV NODE_ENV=development
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
WORKDIR /src
COPY --from=base /src/build ./build
RUN yarn install --only=production
CMD ["yarn", "start"]