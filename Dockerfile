FROM node:16

ARG BUILD_APP_NAME="pushway"
ARG BUILD_APP_GIT_TAG="master"
ARG BUILD_APP_GIT_HASH="master"
ARG BUILD_APP_BUILDER="qyvlik"

WORKDIR /home/www/pushway

COPY package.json *.lock .

RUN npm install

COPY . .

ENV app_name=$BUILD_APP_NAME
ENV app_git_tag=$BUILD_APP_GIT_TAG
ENV app_git_hash=$BUILD_APP_GIT_HASH
ENV app_builder=$BUILD_APP_BUILDER

CMD [ "node", "./app.js" ]

