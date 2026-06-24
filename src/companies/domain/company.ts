export type CompanyId = string;

/**
 * Company aggregate. For authorization purposes a company has an owner (the user
 * that created it, mapped to `created_by`). It carries the data needed to create
 * a company: its identity, owner, name and the optional commercial attributes
 * (cuit, brand, product, origin).
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created company has a null id
 * until saved — mirroring the User and Task aggregates.
 */
export class Company {
  private constructor(
    private _id: CompanyId | null,
    public readonly ownerId: string,
    public readonly companyName: string,
    public readonly cuit: string | null,
    public readonly brand: string | null,
    public readonly product: string | null,
    public readonly origin: string | null,
  ) {}

  /** A brand-new company that has not been persisted yet (no identity). */
  static create(props: {
    ownerId: string;
    companyName: string;
    cuit?: string | null;
    brand?: string | null;
    product?: string | null;
    origin?: string | null;
  }): Company {
    return new Company(
      null,
      props.ownerId,
      props.companyName,
      props.cuit ?? null,
      props.brand ?? null,
      props.product ?? null,
      props.origin ?? null,
    );
  }

  /** Reconstitutes an already-persisted company from a repository. */
  static rehydrate(props: {
    id: CompanyId;
    ownerId: string;
    companyName: string;
    cuit?: string | null;
    brand?: string | null;
    product?: string | null;
    origin?: string | null;
  }): Company {
    return new Company(
      props.id,
      props.ownerId,
      props.companyName,
      props.cuit ?? null,
      props.brand ?? null,
      props.product ?? null,
      props.origin ?? null,
    );
  }

  get id(): CompanyId | null {
    return this._id;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: CompanyId): void {
    if (this._id !== null) {
      throw new Error('Company already has an identity');
    }
    this._id = id;
  }
}
