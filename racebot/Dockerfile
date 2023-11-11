FROM node:16-alpine as base

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

# Build the typescript files
RUN yarn build

FROM base as dev
ENV NODE_ENV=development
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
COPY --from=base /app/build ./build
RUN yarn install --only=production
CMD ["yarn", "start"]
