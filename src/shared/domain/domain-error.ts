/**
 * Root of the domain error hierarchy. Domain and application code throw these to
 * express failures in business terms; the delivery layer (e.g. HTTP) decides how
 * to represent each category. Subclasses carry SEMANTIC meaning only, never
 * transport concerns such as status codes.
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    // Each concrete subclass reports its own name without restating it.
    this.name = new.target.name;
  }
}

/** The requested aggregate does not exist. */
export abstract class NotFoundError extends DomainError {}

/** The actor is not allowed to perform the attempted action. */
export abstract class AuthorizationError extends DomainError {}
