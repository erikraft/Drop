FROM node:22-alpine

RUN apk add --no-cache tor base64

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

COPY onion-gateway/torrc /etc/tor/torrc

RUN chmod +x onion-gateway/entrypoint.sh

ENV NODE_ENV="production"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3000} || exit 1

ENTRYPOINT ["/home/node/app/onion-gateway/entrypoint.sh"]
