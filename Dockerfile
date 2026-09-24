FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_GOOGLE_SITE_VERIFICATION
ARG VITE_GA_MEASUREMENT_ID
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY api/ ./api/
COPY public/blog-data.js ./public/blog-data.js
COPY data/records.json ./data/records.json
COPY PLAN-BUSINESS-COMPLET-NOVA-2026.html ANALIZA-OPERATIONAL-B2B-NOVA.html PLAN-DEZVOLTARE-NOVA.html ./
COPY --from=build /app/dist ./dist
EXPOSE 8000
CMD ["node", "server.js"]
