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

  /**
   * New company link; pass an id to set it, `null` to clear it, or omit it to
   * leave it unchanged.
   */
  @ValidateIf(
    (o: EditTaskDto) => o.companyId !== null && o.companyId !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  readonly companyId?: string | null;

  /**
   * New contact link (a contact of the linked company); pass an id to set it,
   * `null` to clear it, or omit it to leave it unchanged.
   */
  @ValidateIf(
    (o: EditTaskDto) => o.contactId !== null && o.contactId !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  readonly contactId?: string | null;
}
