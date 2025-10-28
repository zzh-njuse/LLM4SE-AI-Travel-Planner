FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY pom.xml mvnw* ./
COPY .mvn .mvn
COPY src ./src
RUN ./mvnw -q -DskipTests package
ENTRYPOINT ["java","-jar","/app/target/trip-service-0.0.1-SNAPSHOT.jar"]
