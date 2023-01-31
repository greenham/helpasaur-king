FROM nginx:1.21.6 as base
RUN rm /etc/nginx/conf.d/default.conf

FROM base as dev
COPY nginx.dev.conf /etc/nginx/conf.d/default.conf

FROM base as production
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf