/**
 * @author axel7083
 */
import { PodletApi } from '/@shared/src/apis/podlet-api';
import type { PodletCliService } from '../services/podlet-cli-service';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { RunResult } from '@podman-desktop/api';
import type { PodletJsService } from '../services/podlet-js-service';

interface Dependencies {
  podlet: PodletCliService;
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
  }): Promise<RunResult> {

    switch (options.type) {
      case QuadletType.CONTAINER:
        return this.dependencies.podletJS.generate(options);
      case QuadletType.IMAGE:
      case QuadletType.POD:
      case QuadletType.VOLUME:
      case QuadletType.NETWORK:
      case QuadletType.KUBE:
        return this.dependencies.podlet.generate(options);
    }
  }

  override async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<RunResult> {
    return this.dependencies.podlet.compose(options);
  }

  override async isInstalled(): Promise<boolean> {
    return this.dependencies.podlet.isInstalled();
  }

  override install(): Promise<void> {
    return this.dependencies.podlet.installLasted();
  }
}
