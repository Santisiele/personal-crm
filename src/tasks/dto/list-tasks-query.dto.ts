import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Optional query-string filters for GET /tasks. */
export class ListTasksQueryDto {
  /** Restrict to tasks currently assigned to this user. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly assigneeId?: string;

  /** Restrict to tasks linked to this company. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly companyId?: string;
}
