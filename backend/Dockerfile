# Imagen del backend para producción. Las imágenes base son multi-arquitectura: sirve igual en
# una PC (amd64) que en la VM ARM de Oracle (arm64).

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Primero solo el pom: las dependencias quedan en una capa que se reutiliza mientras no cambie.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 erp
COPY --from=build /app/target/backend-*.jar app.jar
USER erp
EXPOSE 8080
# El heap se limita con JAVA_OPTS (ver docker-compose.prod.yml).
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
