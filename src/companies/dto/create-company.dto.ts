import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  readonly companyName: string;

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
