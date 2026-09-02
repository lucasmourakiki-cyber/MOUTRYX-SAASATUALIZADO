FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=10000

RUN npm run build

EXPOSE 10000

CMD ["node", "dist/server.cjs"]
