// Vercel serverless entry point. Wraps the same Nest app as src/main.ts but
// exports a request handler instead of calling app.listen() — Vercel owns the
// HTTP server. The Nest instance is cached across invocations within the same
// warm serverless function to avoid re-bootstrapping the whole app per request.
//
// Known limitation: Socket.IO (realtime order tracking, live chat, notification
// push) needs a persistent connection, which serverless functions cannot hold.
// REST endpoints all work; those three features silently won't push live
// updates when this API is deployed here — see README's deployment notes.
import "reflect-metadata";
import type { IncomingMessage, ServerResponse } from "http";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import express, { type Express } from "express";
import helmet from "helmet";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";

let cachedApp: Express | null = null;

async function bootstrap(): Promise<Express> {
  if (cachedApp) return cachedApp;

  const expressApp = express();
  // Trust Vercel's edge proxy so req.ip is the real client IP — otherwise every request
  // looks like it comes from the same address and per-IP rate limiting protects nobody.
  expressApp.set("trust proxy", 1);
  // `cors: true` here would register a second, wildcard-origin CORS middleware that runs
  // BEFORE the restrictive one below and answers preflight requests itself — silently
  // voiding the WEB_ORIGIN allowlist. Only the explicit app.enableCors(...) below should exist.
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? "http://localhost:3000",
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("Glido API")
    .setDescription("Glido Food — customer, admin and payments API")
    .setVersion("0.1")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.init();
  cachedApp = expressApp;
  return expressApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await bootstrap();
  app(req, res);
}
