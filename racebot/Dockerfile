FROM node:16-alpine as base

WORKDIR /src
COPY package.json /
COPY yarn.lock /

FROM base as dev
ENV NODE_ENV=development
RUN yarn global add nodemon && yarn install
COPY . /
CMD ["yarn", "start:dev"]

FROM base as prod
ENV NODE_ENV=production
RUN yarn install --production=false
COPY . /
CMD ["yarn", "start"]