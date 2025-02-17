import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used arguments `podman <image> <arguments>`
 */
export class Exec extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if (this.container.Config.Cmd && !this.arraysEqual(this.container.Config.Cmd, this.image.Config.Cmd)) {
      from.Container.Exec = this.container.Config.Cmd.join(' ');
    }
    return from;
  }
}
