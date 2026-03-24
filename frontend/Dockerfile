# ─── Builder ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Runner (nginx) ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# nginx:alpine auto-runs envsubst on /etc/nginx/templates/*.template → /etc/nginx/conf.d/
ENV BACKEND_URL=http://localhost:3000
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ─── Development ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]
