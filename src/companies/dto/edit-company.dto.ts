import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Body for editing a company. Every field is optional; only the ones present are
 * applied. `companyName`, when present, must be a non-empty string.
 */
export class EditCompanyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly companyName?: string;

  @IsOptional()
  @IsString()
  readonly cuit?: string;

  @IsOptional()
  @IsString()
  readonly brand?: string;

  @IsOptional()
  @IsString()
  readonly product?: string;

  @IsOptional()
  @IsString()
  readonly origin?: string;
}
