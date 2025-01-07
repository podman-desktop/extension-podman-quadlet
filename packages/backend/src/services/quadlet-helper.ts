/**
 * @author axel7083
 */
import type { env, Webview, window } from '@podman-desktop/api';
import { Publisher } from '../utils/publisher';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import { Messages } from '/@shared/src/messages';
import type { PodmanService } from './podman-service';
import type { SystemdService } from './systemd-service';
import type { ProviderService } from './provider-service';

export interface QuadletServiceDependencies {
  providers: ProviderService;
  env: typeof env;
  webview: Webview;
  podman: PodmanService;
  systemd: SystemdService;
  window: typeof window;
}

export abstract class QuadletHelper extends Publisher<QuadletInfo[]> {
  protected constructor(protected dependencies: QuadletServiceDependencies) {
    super(dependencies.webview, Messages.UPDATE_QUADLETS, () => this.all());
  }

  abstract all(): QuadletInfo[];

  protected get providers(): ProviderService {
    return this.dependencies.providers;
  }

  protected get podman(): PodmanService {
    return this.dependencies.podman;
  }
}
