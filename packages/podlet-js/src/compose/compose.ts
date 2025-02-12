import type { ComposeSpecification, PropertiesServices } from 'compose-spec-ts';
import { load } from 'js-yaml';

export class Compose {
  #spec: ComposeSpecification;

  protected constructor(spec: ComposeSpecification) {
    this.#spec = spec;
  }

  public static fromString(raw: string): Compose {
    return new Compose(load(raw) as ComposeSpecification);
  }

  public getServices(): PropertiesServices {
    return this.#spec.services ?? {};
  }

  toKubePlay(): string {
    throw new Error('not implemented yet');
  }
}