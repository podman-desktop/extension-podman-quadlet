/**
 * @author axel7083
 */
import { PodletApi } from '/@shared/src/apis/podlet-api';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import type { QuadletType, QuadletTypeGenerate } from '/@shared/src/utils/quadlet-type';
import type { PodletJsService } from '../services/podlet-js-service';
import type { QuadletGenerateOptions } from '/@shared/src/models/quadlet-generate-options';

interface Dependencies {
  podletJS: PodletJsService;
}

export class PodletApiImpl extends PodletApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async generate<T extends QuadletTypeGenerate>(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: T;
    options: QuadletGenerateOptions & { type: T };
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
