FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dipendenze prima del codice, così la cache regge tra un rebuild e l'altro
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/config || exit 1

CMD ["node", "server/index.js"]
