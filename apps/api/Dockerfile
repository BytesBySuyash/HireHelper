FROM node:24.15.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
RUN npm run db:generate && npm run build -w apps/api
WORKDIR /app/apps/api
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
