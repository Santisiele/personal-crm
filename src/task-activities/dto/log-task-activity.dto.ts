import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LogTaskActivityDto {
  @IsString()
  @IsNotEmpty()
  readonly actionType: string;

  @IsString()
  @IsNotEmpty()
  readonly status: string;

  /** ISO calendar date ('YYYY-MM-DD') the activity took place. */
  @IsDateString()
  readonly activityDate: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly nextAction?: string;

  /** ISO calendar date ('YYYY-MM-DD') for the next action, if any. */
  @IsOptional()
  @IsDateString()
  readonly nextActionDate?: string;
}
