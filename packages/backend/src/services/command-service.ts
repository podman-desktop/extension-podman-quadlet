/**
 * @author axel7083
 */
import type { Disposable, commands as commandsApi, ProviderContainerConnection } from '@podman-desktop/api';
import type { AsyncInit } from '../utils/async-init';
import {
  COMPOSE_LABEL_CONFIG_FILES,
  COMPOSE_LABEL_WORKING_DIR,
  PODLET_COMPOSE_CMD,
  PODLET_GENERATE_CONTAINER_CMD,
} from '../utils/constants';
import type { ContainerInfoUI } from '../models/container-info-ui';
import type { RoutingService } from './routing-service';
import type { ContainerService } from './container-service';
import type { ProviderService } from './provider-service';
import type { ComposeInfoUI } from '../models/compose-info-ui';
import { stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

interface Dependencies {
  commandsApi: typeof commandsApi;
  routing: RoutingService;
  containers: ContainerService;
  providers: ProviderService;
}

export class CommandService implements Disposable, AsyncInit {
  #disposables: Disposable[] = [];

  constructor(protected dependencies: Dependencies) {}

  async init(): Promise<void> {
    this.#disposables.push(
      this.dependencies.commandsApi.registerCommand(
        PODLET_GENERATE_CONTAINER_CMD,
        this.routeToQuadletCreateContainer.bind(this),
      ),
    );

    this.#disposables.push(
      this.dependencies.commandsApi.registerCommand(PODLET_COMPOSE_CMD, this.handleCompose.bind(this)),
    );
  }

  protected async handleCompose(raw: ComposeInfoUI): Promise<void> {
    if (raw.containers.length === 0)
      throw new Error('cannot generate quadlet without containers in the compose project');

    const workingDir: string | undefined = raw.containers[0].labels[COMPOSE_LABEL_WORKING_DIR];
    let configFile: string | undefined = raw.containers[0].labels[COMPOSE_LABEL_CONFIG_FILES];

    if (!configFile || !workingDir)
      throw new Error(
        `Missing labels ${COMPOSE_LABEL_CONFIG_FILES} and ${COMPOSE_LABEL_CONFIG_FILES} in compose containers`,
      );

    if (!isAbsolute(configFile)) {
      configFile = join(workingDir, configFile);
    }

    const stats = await stat(configFile);
    if (!stats.isFile()) {
      throw new Error(`invalid compose configuration file: ${configFile}`);
    }

    return this.dependencies.routing.openQuadletCompose(configFile);
  }

  protected async routeToQuadletCreateContainer(container: ContainerInfoUI): Promise<void> {
    // 1. Get the {@link ProviderContainerConnection} by engine id
    const provider: ProviderContainerConnection =
      await this.dependencies.containers.getRunningProviderContainerConnectionByEngineId(container.engineId);
    // 2. Transform the ProviderContainerConnection in ProviderContainerConnectionDetailedInfo
    const providerIdentifier = this.dependencies.providers.toProviderContainerConnectionDetailedInfo(provider);
    // 3. Open the quadlet create page
    return this.dependencies.routing.openQuadletCreateContainer(providerIdentifier, container.id);
  }

  dispose(): void {
    this.#disposables.forEach(disposable => disposable.dispose());
  }
}
