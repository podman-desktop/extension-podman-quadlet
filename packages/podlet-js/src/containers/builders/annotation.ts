import type { ContainerQuadlet } from '../models/container-quadlet';
import { ContainerQuadletBuilder } from './container-quadlet-builder';
import { IGNORED_ANNOTATIONS } from '../constants';

/**
 * Detect if user used `--annotation` option (E.g. podman run --annotation=foo=bar hello-world)
 */
export class Annotation extends ContainerQuadletBuilder {
  override build(from: ContainerQuadlet): ContainerQuadlet {
    if(!('Annotations' in this.container.HostConfig)) return from;

    const containerAnnotations: Map<string, string> = this.toMap(this.container.HostConfig.Annotations as Record<string, string>);
    const imageAnnotations: Map<string, string> = this.toMap(
      ('Annotations' in this.image)?this.image.Annotations as Record<string, string>:{},
    );

    // we can have multiple annotations
    from.Container.Annotations = Array.from(containerAnnotations.entries()).reduce((accumulator, [key, value]) => {
      if(imageAnnotations.get(key) !== value && !IGNORED_ANNOTATIONS.has(key)) {
        accumulator.push(`${key}=${value}`);
      }

      return accumulator;
    }, [] as Array<string>);

    return from;
  }
}
