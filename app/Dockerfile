# ---- build stage: Quasar v2 + Vue 3 + Vite ----
FROM docker.io/library/node:20-alpine AS build
WORKDIR /src
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---- serve stage ----
FROM docker.io/library/nginx:alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
