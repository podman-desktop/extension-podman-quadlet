import type { ContainerQuadlet } from '../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';
import { IGNORED_ENVIRONMENTS } from '../constants';

/**
 * Detect if user used `--env` option (E.g. podman run --env=foo=bar hello-world)
 */
export class Environment extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if(!('Env' in this.container.Config)) return from;

    const imageEnvironements: Set<string> = new Set(this.image.Config.Env ?? []);

    // we can have multiple annotations
    from.Container.Environment = this.container.Config.Env.reduce((accumulator, env) => {

      const [key] = env.split('=');

      if(!imageEnvironements.has(env) && !IGNORED_ENVIRONMENTS.has(key)) {
        accumulator.push(env);
      }

      return accumulator;
    }, [] as Array<string>);

    return from;
  }
}
