import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Partial edit of a task's content. Every field is optional: an omitted field is
 * left unchanged. Sending `dueDate: null` clears the due date.
 */
export class EditTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly description?: string;

  /**
   * New due date as an ISO calendar date ('YYYY-MM-DD'); pass `null` to clear it,
   * or omit it to leave the current due date untouched.
   */
  @ValidateIf((o: EditTaskDto) => o.dueDate !== null && o.dueDate !== undefined)
  @IsDateString()
  readonly dueDate?: string | null;
}
