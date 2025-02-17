/**
 * @author axel7083
 */
import { PodletApi } from '/@shared/src/apis/podlet-api';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
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
    switch (options.type) {
      case QuadletType.CONTAINER:
        return this.dependencies.podletJS.generate(options);
      case QuadletType.IMAGE:
      case QuadletType.POD:
      case QuadletType.VOLUME:
      case QuadletType.NETWORK:
      case QuadletType.KUBE:
        throw new Error(`unsupported type: ${options.type}`);
    }
  }

  override async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string> {
    return this.dependencies.podletJS.compose(options);
  }
}
