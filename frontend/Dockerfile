# Multi-stage: build the SPA with Node, serve the static output with nginx.
# VITE_API_URL is intentionally not set here — axios.js already falls back to
# the relative "/api", which is what the reverse proxy expects (same-origin).
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
