FROM node:16-alpine as base

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

ARG API_URL
ENV API_URL=$API_URL

ARG API_LOGOUT_URL
ENV API_LOGOUT_URL=$API_LOGOUT_URL

ARG TWITCH_APP_CLIENT_ID
ENV TWITCH_APP_CLIENT_ID=$TWITCH_APP_CLIENT_ID

ARG TWITCH_APP_OAUTH_REDIRECT_URL
ENV TWITCH_APP_OAUTH_REDIRECT_URL=$TWITCH_APP_OAUTH_REDIRECT_URL

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
