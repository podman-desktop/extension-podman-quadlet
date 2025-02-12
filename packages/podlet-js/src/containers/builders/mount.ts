import type { ContainerQuadlet } from '../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `--mount` option
 */
export class Mount extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if(!this.container.Mounts) return from;

    from.Container.Mount = this.container.Mounts.map((mount) => {
      if(!('Type' in mount)) throw new Error(`missing mount in mount ${mount.Source}`);
      switch (mount.Type) {
        case 'bind':
          return `type=${mount.Type},src=${mount.Source},destination=${mount.Destination}${mount.RW?'':':ro'}`;
        case 'volume':
          return `type=${mount.Type},src=${mount.Name},destination=${mount.Destination}${mount.RW?'':':ro'}`;
        case 'tmpfs':
          break;
      }
      throw new Error(`mount type ${mount.Type} not supported`);
    });

    return from;
  }
}
