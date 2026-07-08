FROM node:24.18-trixie-slim AS backend-build
WORKDIR /opt/app

COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/tsconfig.build.json ./

RUN npm ci --prefer-offline --no-audit --no-fund

COPY backend/ .

RUN npm run build \
    && npm run trace

RUN cd /opt/app/dist && \
    find node_modules \( -name '*.js.map' -o -name '*.mjs.map' \) -delete && \
    find node_modules \( -name '*.d.ts' -o -name '*.d.cts' -o -name '*.d.mts' \) -delete

FROM node:24.18-trixie-slim
WORKDIR /opt/app

LABEL org.opencontainers.image.title="Remnawave Subscription Page"
LABEL org.opencontainers.image.description="Remnawave Subscription Page"
LABEL org.opencontainers.image.url="https://github.com/remnawave/subscription-page"
LABEL org.opencontainers.image.source="https://github.com/remnawave/subscription-page"
LABEL org.opencontainers.image.vendor="Remnawave"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL org.opencontainers.image.documentation="https://docs.rw"


RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=backend-build /opt/app/dist ./dist

COPY frontend/dist/ ./frontend/
COPY backend/ecosystem.config.js ./
COPY backend/docker-entrypoint.sh ./

ENV PM2_DISABLE_VERSION_CHECK=true
ENV NODE_OPTIONS="--max-old-space-size=16384"

RUN npm install pm2 -g \
&& rm -rf /usr/local/lib/node_modules/npm \
        /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /usr/local/include/node

ENTRYPOINT [ "/bin/sh", "docker-entrypoint.sh" ]

CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]