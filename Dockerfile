FROM node:alpine

ENV APP_HOME=/opt/container-yaml-generator

COPY lib ${APP_HOME}/lib
COPY package.json ${APP_HOME}
COPY index.js ${APP_HOME}

RUN cd ${APP_HOME} && npm install -g

VOLUME /app 
WORKDIR /app

CMD ["sh"]