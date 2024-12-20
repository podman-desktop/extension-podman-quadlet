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

  override async createQuadletLogger(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadletId: string;
  }): Promise<string> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    const logger = this.dependencies.loggerService.createLogger();

    // do not wait for the returned value as we --follow
    this.dependencies.podman
      .journalctlExec({
        connection: providerConnection,
        args: ['--user', '--follow', `--unit=${options.quadletId}`, '--output=cat'],
        env: {
          SYSTEMD_COLORS: 'true',
          DBUS_SESSION_BUS_ADDRESS: 'unix:path=/run/user/1000/bus',
        },
        logger: logger,
        // the logger has an internal cancellation token, let's use it
        // if the logger is disposed, the process will be killed
        token: logger.token,
      })
      .catch(console.debug);

    return logger.id;
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

  override updateIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    quadlet: string; // content
    path: string;
  }): Promise<void> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    return this.dependencies.quadlet.updateIntoMachine({
      ...options,
      provider: providerConnection,
    });
  }

  override async validate(content: string): Promise<QuadletCheck[]> {
    return new QuadletValidator().validate(content);
  }
}
