import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cors from 'cors'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

 
  app.use(cors());

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
  console.log('🚀 Servidor corriendo en http://localhost:3000');
}
bootstrap();
