/**********************************************************************
 * Copyright (C) 2025-2026 Red Hat, Inc.
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

import type { Disposable, PodInfo, PodInspectInfo } from '@podman-desktop/api';
import type { AsyncInit } from '../utils/async-init';
import type { EngineHelperDependencies } from './engine-helper';
import { EngineHelper } from './engine-helper';
import type { ProviderService } from './provider-service';
import type { SimplePodInfo } from '/@shared/src/models/simple-pod-info';
import type { ContainerService } from './container-service';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';

interface Dependencies extends EngineHelperDependencies {
  providers: ProviderService;
  containerService: ContainerService;
}

export class PodService extends EngineHelper<Dependencies> implements Disposable, AsyncInit {
  constructor(dependencies: Dependencies) {
    super(dependencies);
  }

  async init(): Promise<void> {}

  async all(providerConnection: ProviderContainerConnectionIdentifierInfo): Promise<Array<SimplePodInfo>> {
    const pods = await this.dependencies.containers.listPods();

    const provider = this.dependencies.providers.getProviderContainerConnection(providerConnection);
    const engineInfo = await this.getEngineInfo(provider.connection);

    return pods.reduce((accumulator, current) => {
      if (current.engineId !== engineInfo.engineId) return accumulator;
      accumulator.push(this.toPodInfo(current, providerConnection));
      return accumulator;
    }, [] as Array<SimplePodInfo>);
  }

  protected toPodInfo(pod: PodInfo, connection: ProviderContainerConnectionIdentifierInfo): SimplePodInfo {
    return {
      status: pod.Status,
      id: pod.Id,
      containers: pod.Containers.map(container => ({
        name: container.Names,
        id: container.Id,
        connection: connection,
        state: container.Status,
        image: '<unknown>', // this is not provided by the extension-api
      })),
      name: pod.Name,
      connection: connection,
    };
  }

  public inspectPod(engineId: string, podId: string): Promise<PodInspectInfo> {
    return this.dependencies.containers.inspectPod(engineId, podId);
  }

  dispose(): void {}
}
