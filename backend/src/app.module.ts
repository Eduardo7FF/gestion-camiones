import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios'; //  Importar HttpModule
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { HorariosModule } from './horarios/horarios.module';
import { RutasModule } from './rutas/rutas.module';
import { PosicionesModule } from './posiciones/posiciones.module';
import { CallesModule } from './calles/calles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ // Registrar HttpModule globalmente (opcional)
      timeout: 5000,
      maxRedirects: 5,
    }),
    
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: false, // Correcto para proteger PostGIS
        ssl: {
          rejectUnauthorized: false, 
        },
        extra: {
          ssl: {
            require: true, 
            rejectUnauthorized: false,
          },
        },
      }),
    }),
    
    AuthModule,
    VehiculosModule,
    HorariosModule,
    RutasModule,
    PosicionesModule,
    CallesModule, //  Ya está importado
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}