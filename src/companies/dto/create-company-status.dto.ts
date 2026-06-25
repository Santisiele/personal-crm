import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCompanyStatusDto {
  @IsString()
  @IsNotEmpty()
  readonly description: string;
}
