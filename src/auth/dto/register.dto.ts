// src/modules/auth/dto/register.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
