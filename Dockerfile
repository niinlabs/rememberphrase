# rememberphrase-web — the Svelte/Vite app, built here and served by nginx.
#
# Two stages: the build needs Node and pnpm, the runtime needs neither.

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# CI=true: without a TTY, pnpm otherwise stops at its install prompt and the
# build fails.
RUN CI=true pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Run the master as nginx (uid 101) rather than root. nginx creates its temp
# directories at startup and /var/cache/nginx is root-owned in the base image,
# so they are created and chowned here; without this the container fails to
# start. Inspecting a running container hides the problem, because there the
# directories exist only because a root master already made them.
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
      /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp \
 && chown -R nginx:nginx /var/cache/nginx
USER nginx

EXPOSE 8080
# Probes /reachability.txt rather than /, so the healthcheck also proves the
# asset the app's preparation check depends on is actually being served.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/reachability.txt || exit 1
