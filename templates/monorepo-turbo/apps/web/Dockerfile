FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN cd apps/web && npx next build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3002
CMD ["node", "apps/web/server.js"]
