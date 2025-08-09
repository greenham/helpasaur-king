FROM node:18-alpine as base

WORKDIR /app

# Copy package files for dependency caching
COPY package.json yarn.lock ./

# Cache yarn dependencies
RUN --mount=type=cache,target=/root/.yarn \
    yarn config set network-timeout 600000 -g && \
    yarn install --frozen-lockfile --network-timeout 100000

COPY . .

# Build the typescript files
RUN yarn build

FROM base as dev
ENV NODE_ENV=development
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
COPY --from=base /app/build ./build
RUN --mount=type=cache,target=/root/.yarn \
    yarn config set network-timeout 600000 -g && \
    yarn install --only=production --frozen-lockfile --network-timeout 100000
CMD ["yarn", "start"]
