# syntax=docker/dockerfile:1

FROM node:alpine

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm install && \
    chmod +x node_modules/.bin/*

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
