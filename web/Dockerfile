FROM node:16-alpine as base

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

# Build the app
RUN yarn clean && yarn build

FROM base as dev
ENV NODE_ENV=development
CMD ["yarn", "start"]

FROM base as prod
ENV NODE_ENV=production
COPY --from=base /app/build ./build
RUN yarn global add serve
CMD ["serve", "-s", "./build"]
