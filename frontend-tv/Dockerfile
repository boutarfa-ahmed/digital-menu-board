# Multi-stage: build the SPA with Node, serve the static output with nginx.
# No VITE_ env vars needed at build time — the app talks to "/api" (HTTP and
# WebSocket) on window.location.host, which the reverse proxy provides.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
