import { PartialType } from '@nestjs/mapped-types';
import { CreatePosicionDto } from './create-posicion.dto'; // <-- CORREGIDO: Quité la 'e' extra

// Opcional: Podrías querer renombrar este archivo también a update-posicion.dto.ts

export class UpdatePosicionDto extends PartialType(CreatePosicionDto) {}