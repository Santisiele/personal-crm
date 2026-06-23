/**
 * Driven port for identity generation. Keeps id creation out of the domain
 * logic so it stays deterministic and testable.
 */
export interface IdGenerator {
  next(): string;
}

export const ID_GENERATOR = Symbol('IdGenerator');
