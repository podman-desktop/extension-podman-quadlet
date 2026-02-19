/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import type { Disposable, NetworkInspectInfo } from '@podman-desktop/api';
import type { AsyncInit } from '../utils/async-init';
import type { ProviderService } from './provider-service';
import { EngineHelper, type EngineHelperDependencies } from './engine-helper';
import type {
  ProviderContainerConnectionIdentifierInfo,
  SimpleNetworkInfo,
} from '@podman-desktop/quadlet-extension-core-api';

interface Dependencies extends EngineHelperDependencies {
  providers: ProviderService;
}

export class NetworkService extends EngineHelper<Dependencies> implements Disposable, AsyncInit {
  constructor(dependencies: Dependencies) {
    super(dependencies);
  }

  async init(): Promise<void> {}

  async all(providerConnection: ProviderContainerConnectionIdentifierInfo): Promise<SimpleNetworkInfo[]> {
    const networks = await this.dependencies.containers.listNetworks();

    const provider = this.dependencies.providers.getProviderContainerConnection(providerConnection);
    const engineInfo = await this.getEngineInfo(provider.connection);

    return networks.reduce((output, current) => {
      // ensure it matches provided connection
      if (current.engineId === engineInfo.engineId) {
        output.push(this.toSimpleNetworkInfo(current, providerConnection));
      }
      return output;
    }, [] as SimpleNetworkInfo[]);
  }

  public async inspectNetwork(engineId: string, networkNameOrId: string): Promise<NetworkInspectInfo> {
    const networks = await this.dependencies.containers.listNetworks();
    for (const network of networks) {
      if (network.engineId !== engineId) continue;
      if (network.Name === networkNameOrId || network.Id === networkNameOrId) return network;
    }
    throw new Error(`Network ${networkNameOrId} not found on engine ${engineId}`);
  }

  protected toSimpleNetworkInfo(
    network: NetworkInspectInfo,
    connection: ProviderContainerConnectionIdentifierInfo,
  ): SimpleNetworkInfo {
    return {
      id: network.Id,
      name: network.Name,
      driver: network.Driver,
      connection,
    };
  }

  dispose(): void {}
}
