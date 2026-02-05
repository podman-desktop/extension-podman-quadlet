/**
 * @author axel7083
 */
import { ContainerApi } from '@podman-desktop/quadlet-extension-core-api';
import type {
  SimpleContainerInfo,
  ProviderContainerConnectionIdentifierInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import type { ContainerService } from '../services/container-service';

interface Dependencies {
  containers: ContainerService;
}

export class ContainerApiImpl extends ContainerApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async all(provider: ProviderContainerConnectionIdentifierInfo): Promise<SimpleContainerInfo[]> {
    return this.dependencies.containers.all(provider);
  }
}
