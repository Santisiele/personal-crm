import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

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
  @ValidateIf((o) => o.assigneeId !== null && o.assigneeId !== undefined)
  @IsString()
  @IsNotEmpty()
  readonly assigneeId?: string | null;
}
