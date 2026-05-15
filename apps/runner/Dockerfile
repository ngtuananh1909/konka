FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache docker-cli

COPY package.json ./
RUN npm install

COPY src ./src

CMD ["npm", "run", "dev"]
