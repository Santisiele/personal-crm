// Load .env before anything reads process.env (PrismaService resolves
// DATABASE_URL at construction time). In production, real environment variables
// are already present and a missing .env is simply a no-op.
import 'dotenv/config';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve the built React SPA under /app, making this a single monolithic
  // process for both the API (at the root) and the web client. The frontend is
  // built to web/dist; the API keeps the root path, so the SPA lives under its
  // own /app prefix and never collides with API routes. The SPA uses hash-based
  // routing, so the server only ever serves index.html at /app/ — no deep-link
  // fallback is needed. When web/dist is absent (API-only dev) this is inert.
  // Resolved from the working directory (always the project root when launched
  // via pnpm), which is stable regardless of where the compiler emits main.js.
  const spaRoot = join(process.cwd(), 'web', 'dist');
  app.useStaticAssets(spaRoot, { prefix: '/app' });
  // Serve the SPA shell for a bare /app (no trailing slash), which the static
  // middleware does not resolve to an index on its own.
  app
    .getHttpAdapter()
    .getInstance()
    .get('/app', (_req: unknown, res: { sendFile: (path: string) => void }) =>
      res.sendFile(join(spaRoot, 'index.html')),
    );

  // The SPA (served at /app in production) and, in development, the Vite dev
  // server on another origin both call this API from the browser. CORS is
  // enabled so those cross-origin requests carry their Authorization header.
  // In production the SPA is same-origin, so this is a no-op there.
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });

  // OpenAPI / Swagger UI served at /docs. The API contract is in English; the
  // global JwtAuthGuard protects every route except those marked @Public, so a
  // Bearer access token (from POST /auth/login) is offered globally. The token
  // is persisted in the UI across requests via `persistAuthorization`.
  const config = new DocumentBuilder()
    .setTitle('Personal CRM API')
    .setDescription(
      'Backend de un CRM personal (NestJS + Prisma, arquitectura hexagonal). ' +
        'Casi todas las rutas requieren un Bearer access token obtenido en ' +
        'POST /auth/login.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
