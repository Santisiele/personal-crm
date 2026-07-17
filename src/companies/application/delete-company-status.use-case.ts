import { Actor } from '@/shared/domain/actor';
import { CompanyStatusId } from '@/companies/domain/company-status';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyStatusNotFoundError } from '@/companies/domain/company-status-not-found.error';
import { CompanyStatusRepository } from '@/companies/domain/company-status.repository';

export interface DeleteCompanyStatusCommand {
  actor: Actor;
  statusId: CompanyStatusId;
}

/**
 * Application service for deleting a company status. Managing the catalogue is a
 * CREATOR-only admin surface (delegated to the CompanyAccessPolicy). Deletion is
 * logical: the status disappears from the catalogue and can no longer be
 * assigned, but the row survives so companies already classified with it keep
 * resolving their status label. Raises not-found for an unknown (or already
 * deleted) status.
 */
export class DeleteCompanyStatus {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly statuses: CompanyStatusRepository) {}

  async execute(command: DeleteCompanyStatusCommand): Promise<void> {
    if (!this.policy.canManageStatuses(command.actor)) {
      throw new CompanyAccessDeniedError();
    }
    const status = await this.statuses.findById(command.statusId);
    if (!status) {
      throw new CompanyStatusNotFoundError(command.statusId);
    }
    await this.statuses.softDelete(command.statusId, command.actor.id);
  }
}
