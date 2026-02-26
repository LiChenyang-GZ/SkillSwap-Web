FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY . .

RUN chmod +x ./gradlew
RUN ./gradlew build -x test

EXPOSE 8080
CMD ["sh", "-c", "java -jar $(ls build/libs/*.jar | grep -v plain | head -n 1)"]