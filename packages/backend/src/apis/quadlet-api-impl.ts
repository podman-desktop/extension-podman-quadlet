/**
 * @author axel7083
 */

import { QuadletApi } from '/@shared/src/apis/quadlet-api';
import type { QuadletInfo } from '/@shared/src/models/quadlet-info';
import type { QuadletService } from '../services/quadlet-service';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import type { SystemdService } from '../services/systemd-service';
import type { PodmanService } from '../services/podman-service';
import type { ProviderService } from '../services/provider-service';
import type { QuadletCheck } from '/@shared/src/models/quadlet-check';
import { QuadletValidator } from '../utils/validators/quadlet-validator';
import type { ChildProcess } from 'node:child_process';
import type { LoggerService } from '../services/logger-service';

interface Dependencies {
  quadlet: QuadletService;
  systemd: SystemdService;
  podman: PodmanService;
  providers: ProviderService;
  loggerService: LoggerService;
}

export class QuadletApiImpl extends QuadletApi {
  constructor(protected dependencies: Dependencies) {
    super();
  }

  override async all(): Promise<QuadletInfo[]> {
    return this.dependencies.quadlet.all();
  }

  override async refresh(): Promise<void> {
    return this.dependencies.quadlet.collectPodmanQuadlet();
  }

  override async start(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);
    try {
      return await this.dependencies.systemd.start({
        service: id,
        provider: providerConnection,
        admin: false,
      });
    } finally {
      this.dependencies.quadlet.refreshQuadletsStatuses().catch(console.error);
    }
  }

  override async stop(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);
    try {
      return await this.dependencies.systemd.stop({
        service: id,
        provider: providerConnection,
        admin: false,
      });
    } finally {
      this.dependencies.quadlet.refreshQuadletsStatuses().catch(console.error);
    }
  }

  override async remove(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<void> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    try {
      return await this.dependencies.quadlet.remove({
        provider: providerConnection,
        id: id,
        admin: false,
      });
    } finally {
      this.dependencies.quadlet.refreshQuadletsStatuses().catch(console.error);
    }
  }

  override async read(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<string> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    return await this.dependencies.quadlet.read({
      provider: providerConnection,
      id: id,
      admin: false,
    });
  }

  override async createLogger(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadletId: string;
  }): Promise<string> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    // journalctl --user --unit caddy.service --follow
    const process: ChildProcess = this.dependencies.podman.spawn({
      connection: providerConnection,
      command: 'journalctl',
      args: ['--user', '--follow', `--unit=${options.quadletId}`, '--output=cat'],
    });
    // create a logger
    return this.dependencies.loggerService.createLogger(process);
  }

  override async disposeLogger(loggerId: string): Promise<void> {
    return this.dependencies.loggerService.disposeLogger(loggerId);
  }

  override saveIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadlet: string;
    name: string;
  }): Promise<void> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    return this.dependencies.quadlet.saveIntoMachine({
      ...options,
      provider: providerConnection,
    });
  }

  override async validate(content: string): Promise<QuadletCheck[]> {
    return new QuadletValidator().validate(content);
  }
}
