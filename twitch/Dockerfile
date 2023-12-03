FROM node:16-alpine as base

WORKDIR /app
COPY package.json .
COPY yarn.lock .

FROM base as dev
ENV NODE_ENV=development
RUN yarn global add nodemon && yarn install
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN yarn install --production
COPY src /app/src
CMD ["yarn", "start"]