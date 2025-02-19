import type { ContainerQuadlet } from '../../models/container-quadlet';
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';

export interface Dependencies {
  container: ContainerInspectInfo;
  image: ImageInspectInfo;
}

export abstract class ContainerQuadletBuilder {
  constructor(private dependencies: Dependencies) {}

  protected get image(): ImageInspectInfo {
    return this.dependencies.image;
  }
  protected get container(): ContainerInspectInfo {
    return this.dependencies.container;
  }

  /**
   * Utility function
   * @param record
   * @protected
   */
  protected toMap<T>(record: Record<string, T>): Map<string, T> {
    return new Map(Object.entries(record));
  }

  protected arraysEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  abstract build(from: ContainerQuadlet): ContainerQuadlet;
}
