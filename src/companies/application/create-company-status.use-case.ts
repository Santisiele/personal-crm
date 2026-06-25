import { Actor } from '@/shared/domain/actor';
import { CompanyStatus } from '@/companies/domain/company-status';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyStatusAlreadyExistsError } from '@/companies/domain/company-status-already-exists.error';
import { CompanyStatusRepository } from '@/companies/domain/company-status.repository';

export interface CreateCompanyStatusCommand {
  actor: Actor;
  description: string;
}

/**
 * Application service for creating a company status. Managing the catalogue is a
 * CREATOR-only admin surface (delegated to the CompanyAccessPolicy), and a
 * description must be unique, so a duplicate is rejected as a conflict.
 */
export class CreateCompanyStatus {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly statuses: CompanyStatusRepository) {}

  async execute(command: CreateCompanyStatusCommand): Promise<CompanyStatus> {
    if (!this.policy.canManageStatuses(command.actor)) {
      throw new CompanyAccessDeniedError();
    }

    const existing = await this.statuses.findByDescription(command.description);
    if (existing !== null) {
      throw new CompanyStatusAlreadyExistsError(command.description);
    }

    const status = CompanyStatus.create({ description: command.description });
    await this.statuses.save(status);
    return status;
  }
}
