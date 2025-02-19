import type { ContainerQuadlet } from '../../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `--add-host` option (E.g. podman run --add-host example.com:192.168.10.11 hello-world)
 */
export class AddHost extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    from.Container.AddHost = this.container.HostConfig.ExtraHosts ?? [];
    return from;
  }
}
