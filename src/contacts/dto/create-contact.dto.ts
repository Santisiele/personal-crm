import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  readonly contactName: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  /** ISO calendar date ('YYYY-MM-DD'). */
  @IsOptional()
  @IsDateString()
  readonly birth?: string;
}
