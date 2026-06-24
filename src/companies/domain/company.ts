export type CompanyId = string;

/**
 * Lifecycle status of a company, modelled as the human-readable description of a
 * `company_status` lookup row (the same by-description mapping the Prisma
 * adapters use for the other contexts' statuses). A freshly created company has
 * no explicit status yet (`null`): persistence falls back to the lowest-id
 * `company_status` as the default, exactly as before.
 */
export type CompanyStatus = string;

/**
 * Company aggregate. For authorization purposes a company has an owner (the user
 * that created it, mapped to `created_by`). It carries the data needed to create
 * a company: its identity, owner, name, the optional commercial attributes
 * (cuit, brand, product, origin) and its lifecycle status.
 *
 * Identity is assigned by the repository on first persist (the database owns it,
 * e.g. an autoincrement column), so a freshly created company has a null id
 * until saved — mirroring the User and Task aggregates.
 */
export class Company {
  private constructor(
    private _id: CompanyId | null,
    public readonly ownerId: string,
    private _companyName: string,
    private _cuit: string | null,
    private _brand: string | null,
    private _product: string | null,
    private _origin: string | null,
    private _status: CompanyStatus | null,
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
      // No explicit status on creation; the repository applies the default.
      null,
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
    status?: CompanyStatus | null;
  }): Company {
    return new Company(
      props.id,
      props.ownerId,
      props.companyName,
      props.cuit ?? null,
      props.brand ?? null,
      props.product ?? null,
      props.origin ?? null,
      props.status ?? null,
    );
  }

  get id(): CompanyId | null {
    return this._id;
  }

  get companyName(): string {
    return this._companyName;
  }

  get cuit(): string | null {
    return this._cuit;
  }

  get brand(): string | null {
    return this._brand;
  }

  get product(): string | null {
    return this._product;
  }

  get origin(): string | null {
    return this._origin;
  }

  get status(): CompanyStatus | null {
    return this._status;
  }

  /** Assigns the persistent identity. Only valid once, on first persist. */
  assignId(id: CompanyId): void {
    if (this._id !== null) {
      throw new Error('Company already has an identity');
    }
    this._id = id;
  }

  /**
   * Edits the company's mutable attributes. Only the fields present in `changes`
   * are updated; passing `null` clears an optional attribute, while omitting a
   * key (or passing `undefined`) leaves it untouched.
   */
  update(changes: {
    companyName?: string;
    cuit?: string | null;
    brand?: string | null;
    product?: string | null;
    origin?: string | null;
  }): void {
    if (changes.companyName !== undefined) {
      this._companyName = changes.companyName;
    }
    if (changes.cuit !== undefined) {
      this._cuit = changes.cuit;
    }
    if (changes.brand !== undefined) {
      this._brand = changes.brand;
    }
    if (changes.product !== undefined) {
      this._product = changes.product;
    }
    if (changes.origin !== undefined) {
      this._origin = changes.origin;
    }
  }

  /** Transitions the company to a new lifecycle status (by description). */
  changeStatus(status: CompanyStatus): void {
    this._status = status;
  }
}
