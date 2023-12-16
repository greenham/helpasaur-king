FROM node:16-alpine as base

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

ARG API_HOST
ENV API_HOST=$API_HOST

ARG TWITCH_APP_CLIENT_ID
ENV TWITCH_APP_CLIENT_ID=$TWITCH_APP_CLIENT_ID

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
