FROM node:18-alpine as base

WORKDIR /app
COPY package.json .
COPY yarn.lock .

FROM base as dev
ENV NODE_ENV=development
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn config set network-timeout 600000 -g && \
    yarn global add nodemon && \
    yarn install --frozen-lockfile --network-timeout 100000
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn config set network-timeout 600000 -g && \
    yarn install --production --frozen-lockfile --network-timeout 100000
COPY src /app/src
CMD ["yarn", "start"]