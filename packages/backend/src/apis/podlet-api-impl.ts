/**
 * @author axel7083
 */
import { PodletApi } from '/@shared/src/apis/podlet-api';
import type { PodletCliService } from '../services/podlet-cli-service';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { RunResult } from '@podman-desktop/api';

interface Dependencies {
  podlet: PodletCliService;
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
    return this.dependencies.podlet.exec(
      ['generate', options.type.toLowerCase(), options.resourceId],
      options.connection,
    );
  }

  override async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<RunResult> {
    const args = ['compose'];
    switch (options.type) {
      case QuadletType.POD:
        args.push('--pod');
        break;
      case QuadletType.KUBE:
        args.push('--kube');
        break;
    }
    args.push(options.filepath);
    return this.dependencies.podlet.exec(args);
  }

  override async isInstalled(): Promise<boolean> {
    return this.dependencies.podlet.isInstalled();
  }

  override install(): Promise<void> {
    return this.dependencies.podlet.installLasted();
  }
}
