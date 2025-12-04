FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production
EXPOSE 4000
CMD ["node", "dist/server.js"]