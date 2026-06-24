import { IsNotEmpty, IsString } from 'class-validator';

/** Body for transitioning a company to a new status (by its description). */
export class ChangeCompanyStatusDto {
  @IsString()
  @IsNotEmpty()
  readonly status: string;
}
