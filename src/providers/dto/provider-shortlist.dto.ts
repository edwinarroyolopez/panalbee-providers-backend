import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddProviderShortlistDto {
  @IsMongoId()
  providerId: string;

  /** Nota comercial breve opcional (máx. 320). */
  @IsOptional()
  @IsString()
  @MaxLength(320)
  note?: string;
}

export class PatchProviderShortlistDto {
  /** Cadena vacía borra la nota en shortlist. */
  @IsString()
  @MaxLength(320)
  note: string;
}
