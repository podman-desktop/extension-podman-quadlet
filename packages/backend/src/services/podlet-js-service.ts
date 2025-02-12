import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { ContainerService } from './container-service';
import type { ImageService } from './image-service';
import type { ContainerInspectInfo, ImageInspectInfo, RunResult } from '@podman-desktop/api';
import {Generate} from 'podlet-js';

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
  }): Promise<RunResult> {
    if (options.type !== QuadletType.CONTAINER) throw new Error('not implemented yet');

    // Get the engine id
    const engineId = await this.dependencies.containers.getEngineId(options.connection);

    const container: ContainerInspectInfo = await this.dependencies.containers.inspectContainer(
      engineId,
      options.resourceId,
    );

    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, container.Image);

    return {
      stdout: new Generate({
        container,
        image,
      }).generate(),
      stderr: '',
      command: 'internal',
    };
  }
}
