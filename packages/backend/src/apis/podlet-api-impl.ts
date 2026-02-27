/**
 * @author axel7083
 */
import { PodletApi } from '@podman-desktop/quadlet-extension-core-api';
import type {
  ProviderContainerConnectionIdentifierInfo,
  QuadletType,
} from '@podman-desktop/quadlet-extension-core-api';
import type { PodletJsService } from '../services/podlet-js-service';

interface Dependencies {
  podletJS: PodletJsService;
}

export class PodletApiImpl extends PodletApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override generateContainer(
    connection: ProviderContainerConnectionIdentifierInfo,
    containerId: string,
  ): Promise<string> {
    return this.dependencies.podletJS.generateContainer(connection, containerId);
  }
  override generateImage(connection: ProviderContainerConnectionIdentifierInfo, imageId: string): Promise<string> {
    return this.dependencies.podletJS.generateImage(connection, imageId);
  }
  override generatePod(connection: ProviderContainerConnectionIdentifierInfo, podId: string): Promise<string> {
    return this.dependencies.podletJS.generatePod(connection, podId);
  }
  override generateVolume(connection: ProviderContainerConnectionIdentifierInfo, volumeId: string): Promise<string> {
    return this.dependencies.podletJS.generateVolume(connection, volumeId);
  }
  override generateNetwork(connection: ProviderContainerConnectionIdentifierInfo, networkId: string): Promise<string> {
    return this.dependencies.podletJS.generateNetwork(connection, networkId);
  }

  override async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string> {
    return this.dependencies.podletJS.compose(options);
  }
}
