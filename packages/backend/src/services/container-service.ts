/**
 * @author axel7083
 */
import type { Disposable, ContainerInfo, ProviderContainerConnection, ContainerInspectInfo } from '@podman-desktop/api';
import type { AsyncInit } from '../utils/async-init';
import type {
  SimpleContainerInfo,
  ProviderContainerConnectionIdentifierInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import type { ProviderService } from './provider-service';
import { EngineHelper, type EngineHelperDependencies } from './engine-helper';

interface Dependencies extends EngineHelperDependencies {
  providers: ProviderService;
}

export class ContainerService extends EngineHelper<Dependencies> implements Disposable, AsyncInit {
  constructor(dependencies: Dependencies) {
    super(dependencies);
  }

  async init(): Promise<void> {}

  async all(providerConnection: ProviderContainerConnectionIdentifierInfo): Promise<SimpleContainerInfo[]> {
    const containers = await this.dependencies.containers.listContainers();

    const provider = this.dependencies.providers.getProviderContainerConnection(providerConnection);
    const engineInfo = await this.getEngineInfo(provider.connection);

    return containers.reduce((output, current) => {
      // ensure it match provided connection
      if (current.engineId === engineInfo.engineId) {
        output.push(
          this.toSimpleContainerInfo(
            current,
            this.dependencies.providers.toProviderContainerConnectionDetailedInfo(provider),
          ),
        );
      }
      return output;
    }, [] as SimpleContainerInfo[]);
  }

  /**
   * This method return the ContainerProviderConnection corresponding to an engineId
   * @remarks only works with running container connection
   * @param engineId
   */
  async getRunningProviderContainerConnectionByEngineId(engineId: string): Promise<ProviderContainerConnection> {
    for (const provider of this.dependencies.providers.getContainerConnections()) {
      if (provider.connection.status() !== 'started') continue;

      const infos = await this.dependencies.containers.listInfos({ provider: provider.connection });
      if (infos.length === 0) continue;

      if (infos[0].engineId === engineId) return provider;
    }
    throw new Error('connection not found');
  }

  public async getEngineId(connection: ProviderContainerConnectionIdentifierInfo): Promise<string> {
    const provider = this.dependencies.providers.getProviderContainerConnection(connection);

    const info = await this.getEngineInfo(provider.connection);
    return info.engineId;
  }

  public inspectContainer(engineId: string, containerId: string): Promise<ContainerInspectInfo> {
    return this.dependencies.containers.inspectContainer(engineId, containerId);
  }

  protected toSimpleContainerInfo(
    container: ContainerInfo,
    connection: ProviderContainerConnectionIdentifierInfo,
  ): SimpleContainerInfo {
    return {
      id: container.Id,
      name: container.Names[0] ?? '<none>',
      state: container.State,
      image: container.Image,
      connection,
    };
  }

  dispose(): void {}
}
