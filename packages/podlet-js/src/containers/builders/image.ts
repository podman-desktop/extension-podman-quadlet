import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect which image is used
 */
export class Image extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    from.Container.Image = this.container.Config.Image;
    return from;
  }
}
