FROM node:18-alpine

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Crear directorio de uploads si no existe
RUN mkdir -p backend/uploads

# Exponer puertos necesarios
EXPOSE 8080
EXPOSE 3001

# Comando para iniciar tanto el frontend como el backend
CMD ["npm", "run", "dev"]