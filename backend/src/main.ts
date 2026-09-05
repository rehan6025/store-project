import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: true,
        // origin: 'fe url',
        credentials: true,
    });

    await app.listen(process.env.PORT ?? "3000");

    console.log(
        `BACKEND API running on http://localhost:${process.env.PORT ?? "3000"}`,
    );
}

bootstrap();
