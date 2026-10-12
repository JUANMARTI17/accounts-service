# syntax=docker/dockerfile:1

# ---- build: instala todo y compila TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime: solo dependencias de producción + dist ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# ca.pem y .env NO van en la imagen: se montan o se inyectan en tiempo de ejecución
# (Render: Secret File en /etc/secrets/ca.pem y KAFKA_SSL_CA_LOCATION=/etc/secrets/ca.pem).
USER node
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8081)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
