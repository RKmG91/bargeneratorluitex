FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json npm-shrinkwrap.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY servidor.js ./
COPY public ./public
ENV HOST=0.0.0.0
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node", "servidor.js"]
