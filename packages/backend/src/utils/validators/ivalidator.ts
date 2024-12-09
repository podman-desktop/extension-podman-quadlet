/**
 * @author axel7083
 */

export abstract class Validator<T, O> {
  abstract validate(content: T): O;
}
