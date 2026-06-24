export type CompanyContactLinkId = string;

/**
 * Association between a company and a contact (the `contact_x_company` join with
 * its own attributes: the contact's role in the company and a phone). Identity
 * is assigned by the repository on first persist, like the other aggregates.
 */
export class CompanyContactLink {
  private constructor(
    private _id: CompanyContactLinkId | null,
    public readonly companyId: string,
    public readonly contactId: string,
    public readonly roleInCompany: string | null,
    public readonly phone: string | null,
  ) {}

  /** A brand-new link that has not been persisted yet (no identity). */
  static create(props: {
    companyId: string;
    contactId: string;
    roleInCompany?: string | null;
    phone?: string | null;
  }): CompanyContactLink {
    return new CompanyContactLink(
      null,
      props.companyId,
      props.contactId,
      props.roleInCompany ?? null,
      props.phone ?? null,
    );
  }

  /** Reconstitutes an already-persisted link from a repository. */
  static rehydrate(props: {
    id: CompanyContactLinkId;
    companyId: string;
    contactId: string;
    roleInCompany?: string | null;
    phone?: string | null;
  }): CompanyContactLink {
    return new CompanyContactLink(
      props.id,
      props.companyId,
      props.contactId,
      props.roleInCompany ?? null,
      props.phone ?? null,
    );
  }

  get id(): CompanyContactLinkId | null {
    return this._id;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: CompanyContactLinkId): void {
    if (this._id !== null) {
      throw new Error('CompanyContactLink already has an identity');
    }
    this._id = id;
  }
}
