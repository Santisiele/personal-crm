import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LinkContactDto {
  @IsString()
  @IsNotEmpty()
  readonly contactId: string;

  @IsOptional()
  @IsString()
  readonly roleInCompany?: string;

  @IsOptional()
  @IsString()
  readonly phone?: string;
}
