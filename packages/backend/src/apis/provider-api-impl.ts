/**
 * @author axel7083
 */
import type { PodmanService } from '../services/podman-service';
import { ProviderApi } from '@quadlet/core-api';
import type { ProviderContainerConnectionDetailedInfo } from '@quadlet/core-api';
import type { ProviderService } from '../services/provider-service';

interface Dependencies {
  podman: PodmanService;
  providers: ProviderService;
}

export class ProviderApiImpl extends ProviderApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async all(): Promise<ProviderContainerConnectionDetailedInfo[]> {
    return this.dependencies.providers.all();
  }
}
