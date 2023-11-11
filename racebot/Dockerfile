FROM node:16-alpine as base

WORKDIR /src

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.yarn to speed up subsequent builds.
# Leverage a bind mounts to package.json and yarn.lock to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/root/.yarn \
    yarn install --production=false --frozen-lockfile
# COPY package.json /
# COPY yarn.lock /

FROM base as dev
ENV NODE_ENV=development
#RUN yarn global add nodemon
COPY . .
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
COPY . .
CMD ["yarn", "start"]