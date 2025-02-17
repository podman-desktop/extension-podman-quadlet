import type { ContainerQuadlet } from '../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `--entrypoint` option (E.g. podman run --entrypoint=/foo.sh hello-world)
 */
export class Entrypoint extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (this.container.Config.Entrypoint) {
      // if entrypoint is string and is not the same as the image entrypoint => user defined entrypoint
      if (
        typeof this.container.Config.Entrypoint === 'string' &&
        this.container.Config.Entrypoint !== this.image.Config.Entrypoint &&
        this.container.Config.Entrypoint.length > 0
      ) {
        from.Container.Entrypoint = this.container.Config.Entrypoint;
      } else if (
        Array.isArray(this.container.Config.Entrypoint) &&
        this.container.Config.Entrypoint.length > 0 &&
        !this.arraysEqual(this.container.Config.Entrypoint, this.image.Config.Entrypoint)
      ) {
        from.Container.Entrypoint = this.container.Config.Entrypoint.join(' ');
      }
    }
    return from;
  }
}
