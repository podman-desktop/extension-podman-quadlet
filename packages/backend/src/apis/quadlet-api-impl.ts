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
import type { LoggerService } from '../services/logger-service';
import type { SynchronisationInfo } from '/@shared/src/models/synchronisation';

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
    // ensure the quadlet exists & have an associated systemd service
    const quadlet = this.dependencies.quadlet.getQuadlet(id);
    if (!quadlet.service)
      throw new Error(`cannot start quadlet: quadlet with id ${id} does not have an associated systemd service`);

    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    try {
      return await this.dependencies.systemd.start({
        service: quadlet.service,
        provider: providerConnection,
        admin: false,
      });
    } finally {
      this.dependencies.quadlet.refreshQuadletsStatuses().catch(console.error);
    }
  }

  override async stop(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean> {
    // ensure the quadlet exists & have an associated systemd service
    const quadlet = this.dependencies.quadlet.getQuadlet(id);
    if (!quadlet.service)
      throw new Error(`cannot stop quadlet: quadlet with id ${id} does not have an associated systemd service`);

    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    try {
      return await this.dependencies.systemd.stop({
        service: quadlet.service,
        provider: providerConnection,
        admin: false,
      });
    } finally {
      this.dependencies.quadlet.refreshQuadletsStatuses().catch(console.error);
    }
  }

  override async remove(connection: ProviderContainerConnectionIdentifierInfo, ...ids: string[]): Promise<void> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    try {
      return await this.dependencies.quadlet.remove({
        provider: providerConnection,
        ids: ids,
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
    // ensure the quadlet exists & have an associated systemd service
    const quadlet = this.dependencies.quadlet.getQuadlet(options.quadletId);
    if (!quadlet.service)
      throw new Error(
        `cannot create quadlet logger quadlet: quadlet with id ${options.quadletId} does not have an associated systemd service`,
      );

    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    const logger = this.dependencies.loggerService.createLogger();

    // do not wait for the returned value as we --follow
    this.dependencies.podman
      .journalctlExec({
        connection: providerConnection,
        args: ['--user', '--follow', `--unit=${quadlet.service}`, '--output=cat'],
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

  override async getSynchronisationInfo(): Promise<SynchronisationInfo[]> {
    return this.dependencies.quadlet.getSynchronisationInfo();
  }

  override async getKubeYAML(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<string> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    return await this.dependencies.quadlet.getKubeYAML({
      provider: providerConnection,
      id: id,
    });
  }
}
