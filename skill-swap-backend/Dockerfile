# 使用轻量级的 JRE（只有运行环境，没有编译工具，体积小）
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 把你在本地打好的 JAR 包拷贝到镜像里
# 注意：确保这个文件名和你 build/libs 文件夹下的一致
COPY build/libs/skill-swap-backend.jar app.jar

EXPOSE 8080

# 针对 1GB 内存的“保命”配置
ENTRYPOINT ["java", "-Xmx512m", "-Xms256m", "-jar", "app.jar"]