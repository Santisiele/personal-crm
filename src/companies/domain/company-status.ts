export type CompanyStatusId = string;

/**
 * CompanyStatus aggregate. Represents a row of the `company_status` catalogue: a
 * free-form, human-readable description (a business value, often Spanish such as
 * "Prospecto" or "Cliente") that classifies a company's lifecycle state.
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * an autoincrement column), so a freshly created status has a null id until
 * saved — mirroring the Company aggregate.
 */
export class CompanyStatus {
  private constructor(
    private _id: CompanyStatusId | null,
    public readonly description: string,
  ) {}

  /** A brand-new status that has not been persisted yet (no identity). */
  static create(props: { description: string }): CompanyStatus {
    return new CompanyStatus(null, props.description);
  }

  /** Reconstitutes an already-persisted status from a repository. */
  static rehydrate(props: {
    id: CompanyStatusId;
    description: string;
  }): CompanyStatus {
    return new CompanyStatus(props.id, props.description);
  }

  get id(): CompanyStatusId | null {
    return this._id;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: CompanyStatusId): void {
    if (this._id !== null) {
      throw new Error('CompanyStatus already has an identity');
    }
    this._id = id;
  }
}
