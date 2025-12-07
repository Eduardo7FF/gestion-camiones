import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CallesController } from './calles.controller';
import { CallesExternasService } from './calles-externas.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // ✅ 10 segundos de timeout
      maxRedirects: 5,
    })
  ],
  controllers: [CallesController],
  providers: [CallesExternasService],
})
export class CallesModule {}