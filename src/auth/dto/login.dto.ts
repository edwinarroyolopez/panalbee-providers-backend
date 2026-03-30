import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
