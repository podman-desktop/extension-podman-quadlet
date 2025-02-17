import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { ContainerService } from './container-service';
import type { ImageService } from './image-service';
import type { ContainerInspectInfo, ImageInspectInfo } from '@podman-desktop/api';
import { Generate, Compose } from 'podlet-js';
import { readFile } from 'node:fs/promises';

interface Dependencies {
  containers: ContainerService;
  images: ImageService;
}

export class PodletJsService {
  constructor(protected dependencies: Dependencies) {}

  public async generate(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: QuadletType;
    resourceId: string;
  }): Promise<string> {
    if (options.type !== QuadletType.CONTAINER) throw new Error('not implemented yet');

    // Get the engine id
    const engineId = await this.dependencies.containers.getEngineId(options.connection);

    const container: ContainerInspectInfo = await this.dependencies.containers.inspectContainer(
      engineId,
      options.resourceId,
    );

    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, container.Image);

    return new Generate({
      container,
      image,
    }).generate();
  }

  public async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string> {
    const content = await readFile(options.filepath, { encoding: 'utf8' });
    return Compose.fromString(content).toKubePlay();
  }
}
