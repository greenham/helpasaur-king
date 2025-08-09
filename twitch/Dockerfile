FROM helpa-base:latest as base

WORKDIR /app

# Copy package files for dependency caching
COPY package.json yarn.lock ./

# Cache yarn dependencies
RUN --mount=type=cache,target=/root/.yarn \
    yarn config set network-timeout 600000 -g && \
    yarn install --frozen-lockfile --network-timeout 100000

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/root/.yarn \
    yarn config set network-timeout 600000 -g && \
    yarn global add nodemon && \
    yarn install --frozen-lockfile --network-timeout 100000
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
# Copy only production dependencies from base
RUN --mount=type=cache,target=/root/.yarn \
    yarn config set network-timeout 600000 -g && \
    yarn install --production --frozen-lockfile --network-timeout 100000
COPY src /app/src
CMD ["yarn", "start"]