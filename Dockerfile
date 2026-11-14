FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
