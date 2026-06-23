import { IdGenerator } from '../../domain/id-generator';

/**
 * Deterministic test double: yields '1', '2', '3', ... so assertions on ids are
 * predictable.
 */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return String(this.counter);
  }
}
