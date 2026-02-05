/**
 * @author axel7083
 */
import { ContainerApi } from '@quadlet/core-api';
import type { SimpleContainerInfo, ProviderContainerConnectionIdentifierInfo } from '@quadlet/core-api';
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
