import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect which name is used
 */
export class Name extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (this.container.Name.startsWith('/')) {
      from.Container.ContainerName = this.container.Name.substring(1);
    } else {
      from.Container.ContainerName = this.container.Name;
    }
    return from;
  }
}
