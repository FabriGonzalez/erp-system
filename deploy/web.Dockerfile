# Web del ERP: se exporta con Expo y la sirve Caddy. El contexto del build es frontend/erp-system.

FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# EXPO_PUBLIC_* queda fija dentro del bundle al exportar: cambiarla exige reconstruir la imagen.
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export -p web

FROM caddy:2
COPY --from=build /app/dist /srv
