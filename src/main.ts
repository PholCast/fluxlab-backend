import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    contentSecurityPolicy: false, // evita problemas con Swagger en dev
  }));

  app.enableCors({
    origin: '*', // Cambiar esto al dominio específico en producción
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, //se agregó esto para cuando se use la librería transformer en los DTO 
    }),
  );


  const config = new DocumentBuilder().setTitle('Fluxlab API').setDescription('Fluxlab API description').setVersion('1.0').build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });



  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
