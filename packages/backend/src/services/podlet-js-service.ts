import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { ContainerService } from './container-service';
import type { ImageService } from './image-service';
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';
import { ContainerGenerator, Compose, ImageGenerator } from 'podlet-js';
import { readFile } from 'node:fs/promises';

interface Dependencies {
  containers: ContainerService;
  images: ImageService;
}

export class PodletJsService {
  constructor(protected dependencies: Dependencies) {}

  /**
   * Using the `podlet-js` package, generate a stringify {@link ContainerQuadlet}
   * @param engineId
   * @param containerId
   * @protected
   */
  protected async generateContainer(engineId: string, containerId: string): Promise<string> {
    const container: ContainerInspectInfo = await this.dependencies.containers.inspectContainer(engineId, containerId);

    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, container.Image);

    return new ContainerGenerator({
      container,
      image,
    }).generate();
  }

  /**
   * Using the `podlet-js` package, generate a stringify {@link ImageQuadlet}
   * @param engineId
   * @param imageId
   * @protected
   */
  protected async generateImage(engineId: string, imageId: string): Promise<string> {
    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, imageId);

    return new ImageGenerator({
      image: image,
    }).generate();
  }

  public async generate(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: QuadletType;
    resourceId: string;
  }): Promise<string> {
    // Get the engine id
    const engineId = await this.dependencies.containers.getEngineId(options.connection);

    switch (options.type) {
      case QuadletType.CONTAINER:
        return await this.generateContainer(engineId, options.resourceId);
      case QuadletType.IMAGE:
        return await this.generateImage(engineId, options.resourceId);
      case QuadletType.POD:
      case QuadletType.VOLUME:
      case QuadletType.NETWORK:
      case QuadletType.KUBE:
        throw new Error(`cannot generate quadlet type ${options.type}: unsupported`);
    }
  }

  public async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string> {
    if (options.type !== QuadletType.KUBE) throw new Error(`cannot generate quadlet type ${options.type}: unsupported`);

    const content = await readFile(options.filepath, { encoding: 'utf8' });
    return Compose.fromString(content).toKubePlay();
  }
}
