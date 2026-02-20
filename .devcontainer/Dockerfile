# Usa Node 20 slim
FROM node:20-slim

WORKDIR /workspace

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala só o express
RUN npm install --production

# Copia todos os arquivos da raiz
COPY . .

EXPOSE 8000

# Roda o servidor Node
CMD ["node", "server.js"]