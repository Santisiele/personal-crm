import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Partial edit of a contact: every attribute is optional, but anything sent is
 * validated. Omitted attributes are left untouched by the use case.
 */
export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly contactName?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  /** ISO calendar date ('YYYY-MM-DD'). */
  @IsOptional()
  @IsDateString()
  readonly birth?: string;
}
