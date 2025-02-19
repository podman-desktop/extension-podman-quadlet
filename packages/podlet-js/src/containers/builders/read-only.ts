import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `--read-only` option
 */
export class ReadOnly extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (this.container.HostConfig.ReadonlyRootfs) {
      from.Container.ReadOnly = true;
    }
    return from;
  }
}
