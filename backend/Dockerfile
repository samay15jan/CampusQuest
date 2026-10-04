FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
COPY db ./db
COPY scripts ./scripts
EXPOSE 3000
CMD ["npm", "run", "dev"]
