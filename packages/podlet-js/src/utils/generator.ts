import type { IIniObject } from 'js-ini/src/interfaces/ini-object';

export abstract class Generator<T> {
  constructor(protected dependencies: T) {}

  /**
   * The object is under the format `{ Container: { Annotation: Array<string>, ... } }` but js-ini
   * need to have `{ Container: Array<string> }` to convert it to ini.
   *
   * See https://github.com/Sdju/js-ini/pull/37 for future improvement
   *
   * @protected
   * @param obj
   */
  protected format(obj: unknown): IIniObject {
    if (!obj || typeof obj !== 'object') throw new Error(`cannot format object of type ${typeof obj}`);

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        return [
          key,
          Object.entries(value).reduce((accumulator, [item, content]) => {
            if (Array.isArray(content)) {
              accumulator.push(...content.map(v => `${item}=${v}`));
            } else {
              accumulator.push(`${item}=${content}`);
            }
            return accumulator;
          }, [] as string[]),
        ];
      }),
    );
  }

  abstract generate(): string;
}
