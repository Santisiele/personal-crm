import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
