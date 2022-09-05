FROM node:16-alpine as base

WORKDIR /src
COPY package.json /
COPY yarn.lock /

FROM base as dev
ENV NODE_ENV=development
RUN yarn global add nodemon && yarn install
COPY . /
CMD ["nodemon", "src/discord.js"]

FROM base as production
ENV NODE_ENV=production
RUN yarn install --production
COPY . /
CMD ["yarn", "start"]