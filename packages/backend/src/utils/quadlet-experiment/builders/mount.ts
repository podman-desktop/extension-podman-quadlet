import type { ContainerQuadlet } from '../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `--mount` option
 */
export class Mount extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if(!this.container.HostConfig.Mounts) return from;

    from.Container.Mount = this.container.HostConfig.Mounts.map((mount) => {
      switch (mount.Type) {
        case 'bind':
          return `type=${mount.Type},src=${mount.Source},destination=${mount.Target}${mount.ReadOnly?'ro':''}`;
        case 'volume':
          break;
        case 'tmpfs':
          break;
      }
      throw new Error(`mount type ${mount.Type} not supported`);
    });

    return from;
  }
}
