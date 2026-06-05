# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS build-stage

WORKDIR /app

COPY pom.xml ./
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# Run stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build-stage /app/target/*.jar app.jar

RUN mkdir -p /app/uploads && chown -R spring:spring /app/uploads

USER spring

# EXPOSE is documentation only — actual port set via SERVER_PORT_REPORT in docker-compose
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
