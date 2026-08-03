FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY migrations/ ./migrations/
COPY seed.js ./

EXPOSE 3000

CMD ["sh", "-c", "node migrations/migrate.js && node src/index.js"]
