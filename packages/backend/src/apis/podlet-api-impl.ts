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

  override async generate(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: QuadletType;
    resourceId: string;
  }): Promise<string> {
    return this.dependencies.podletJS.generate(options);
  }

  override async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string> {
    return this.dependencies.podletJS.compose(options);
  }
}
