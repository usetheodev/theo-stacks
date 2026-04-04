FROM gradle:8-jdk21 AS builder
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
COPY packages/shared ./packages/shared
RUN gradle :apps:worker:bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/apps/worker/build/libs/*.jar app.jar
EXPOSE 8081
CMD ["java", "-jar", "app.jar"]
