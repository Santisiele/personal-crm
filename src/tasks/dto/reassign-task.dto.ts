import { IsNotEmpty, IsString } from 'class-validator';

export class ReassignTaskDto {
  @IsString()
  @IsNotEmpty()
  readonly newAssigneeId: string;
}
