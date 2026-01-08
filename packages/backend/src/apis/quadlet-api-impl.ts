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
import type { Template } from '/@shared/src/models/template';
import type { PodmanWorker } from '../utils/worker/podman-worker';
import { isTemplateQuadlet } from '/@shared/src/models/template-quadlet';
import type { ServiceQuadlet } from '/@shared/src/models/service-quadlet';
import { isServiceQuadlet } from '/@shared/src/models/service-quadlet';

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

  private checkQuadlet(id: string): ServiceQuadlet {
    const quadlet = this.dependencies.quadlet.getQuadlet(id);
    if (!isServiceQuadlet(quadlet))
      throw new Error(`quadlet with id ${quadlet.id} does not have an associated systemd service`);

    if (isTemplateQuadlet(quadlet) && !quadlet.defaultInstance)
      throw new Error(`quadlet with id ${quadlet.id} is a template that cannot be enabled.`);
    return quadlet;
  }

  override async start(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean> {
    let quadlet: ServiceQuadlet;

    try {
      quadlet = this.checkQuadlet(id);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`cannot start quadlet: ${error.message}`);
      }
      throw error;
    }

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
    let quadlet: ServiceQuadlet;

    try {
      quadlet = this.checkQuadlet(id);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`cannot stop quadlet: ${error.message}`);
      }
      throw error;
    }

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

  override async restart(connection: ProviderContainerConnectionIdentifierInfo, id: string): Promise<boolean> {
    let quadlet: ServiceQuadlet;

    try {
      quadlet = this.checkQuadlet(id);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`cannot restart quadlet: ${error.message}`);
      }
      throw error;
    }

    const providerConnection = this.dependencies.providers.getProviderContainerConnection(connection);

    try {
      return await this.dependencies.systemd.restart({
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
    let quadlet: ServiceQuadlet;

    try {
      quadlet = this.checkQuadlet(options.quadletId);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`cannot create quadlet logger: ${error.message}`);
      }
      throw error;
    }

    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    const logger = this.dependencies.loggerService.createLogger();

    // get the worker
    const worker: PodmanWorker = await this.dependencies.podman.getWorker(providerConnection);

    // do not wait for the returned value as we --follow
    worker
      .journalctlExec({
        args: ['--user', '--follow', `--unit=${quadlet.service}`, '--output=cat'],
        env: {
          SYSTEMD_COLORS: 'true',
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

  override async getSynchronisationInfo(): Promise<SynchronisationInfo[]> {
    return this.dependencies.quadlet.getSynchronisationInfo();
  }

  override writeIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    files: Array<{ filename: string; content: string }>;
    skipSystemdDaemonReload?: boolean;
  }): Promise<void> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);

    return this.dependencies.quadlet.writeIntoMachine({
      ...options,
      provider: providerConnection,
    });
  }

  override readIntoMachine(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    path: string;
  }): Promise<string> {
    const providerConnection = this.dependencies.providers.getProviderContainerConnection(options.connection);
    return this.dependencies.quadlet.readIntoMachine({
      path: options.path,
      provider: providerConnection,
    });
  }

  override async templates(): Promise<Array<Template>> {
    return this.dependencies.quadlet.templates();
  }
}
