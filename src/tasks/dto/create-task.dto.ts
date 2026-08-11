import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly description: string;

  /**
   * Who the task is assigned to. Omit it to assign the task to yourself; pass
   * `null` to leave it unassigned (privileged actors only); pass a user id to
   * assign it to that user (privileged actors only, unless it is yourself).
   */
  @ValidateIf(
    (o: CreateTaskDto) => o.assigneeId !== null && o.assigneeId !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  readonly assigneeId?: string | null;

  /**
   * Optional due date as an ISO calendar date ('YYYY-MM-DD'). Pass `null` (or
   * omit it) to leave the task without a due date.
   */
  @ValidateIf((o: CreateTaskDto) => o.dueDate !== null)
  @IsOptional()
  @IsDateString()
  readonly dueDate?: string | null;

  /** Optional id of the company this task is associated with. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly companyId?: string;

  /** Optional id of the contact (of that company) the task is about. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly contactId?: string;
}
