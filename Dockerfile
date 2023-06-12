FROM node:16.15.1-alpine as base
RUN apk add --no-cache git
WORKDIR /usr/app
EXPOSE 1337
COPY package*.json ./
RUN npm install
COPY . .

# Build step for production
FROM base
RUN npm run build
RUN npm install pm2 -g
CMD ["pm2-runtime", "build/main.js"]