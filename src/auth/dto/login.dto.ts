// src/modules/auth/dto/login.dto.ts
import { IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MaxLength(20)
  phone: string;
}
