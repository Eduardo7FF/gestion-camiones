import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'admin123',
      database: 'gestion_camiones',
      autoLoadEntities: true,
      synchronize: true, // ⚠️ solo en desarrollo
    }),
    AuthModule,
  ],
})
export class AppModule {}
