import type { ContainerQuadlet } from '../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';

/**
 * Detect if user used `-p` option (E.g. podman run -p 8080:80 hello-world)
 */
export class PublishPort extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    const portBindings = this.container.HostConfig.PortBindings;
    if (!portBindings) return from;

    from.Container.PublishPort = Object.entries(portBindings).reduce((accumulator, [key, values]) => {
      if (!Array.isArray(values)) throw new Error(`malformed port binding for container port ${key}`);

      const parts = key.split('/');
      const containerPort = Number.parseInt(parts[0]);
      if (isNaN(containerPort)) throw new Error(`invalid container port: ${key}`);

      values.forEach(value => {
        let result = '';
        if (typeof value.HostIp === 'string' && value.HostIp !== '0.0.0.0') {
          result = `${result}${value.HostIp}:`;
        }
        accumulator.push(`${result}${value.HostPort}:${containerPort}`);
      });

      return accumulator;
    }, [] as Array<string>);

    return from;
  }
}
