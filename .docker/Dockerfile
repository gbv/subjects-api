FROM node:20-alpine

WORKDIR /usr/src/app

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

RUN mkdir /data

# Use pm2 to run app
RUN npm i -g pm2

ENV DATABASE=/data/subjects.db

CMD pm2-runtime server.js
