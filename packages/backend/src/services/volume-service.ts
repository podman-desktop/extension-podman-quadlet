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

import type { Disposable, VolumeInfo } from '@podman-desktop/api';
import type { AsyncInit } from '../utils/async-init';
import type {
  SimpleVolumeInfo,
  ProviderContainerConnectionIdentifierInfo,
} from '@podman-desktop/quadlet-extension-core-api';
import type { ProviderService } from './provider-service';
import { EngineHelper, type EngineHelperDependencies } from './engine-helper';

interface Dependencies extends EngineHelperDependencies {
  providers: ProviderService;
}

export class VolumeService extends EngineHelper<Dependencies> implements Disposable, AsyncInit {
  constructor(dependencies: Dependencies) {
    super(dependencies);
  }

  async init(): Promise<void> {}

  async all(providerConnection: ProviderContainerConnectionIdentifierInfo): Promise<SimpleVolumeInfo[]> {
    const volumes = await this.dependencies.containers.listVolumes();

    const provider = this.dependencies.providers.getProviderContainerConnection(providerConnection);
    const engineInfo = await this.getEngineInfo(provider.connection);

    return volumes.reduce((output, current) => {
      // ensure it match provided connection
      if (current.engineId === engineInfo.engineId) {
        output.push(
          ...current.Volumes.map(v =>
            this.toSimpleVolumeInfo(v, this.dependencies.providers.toProviderContainerConnectionDetailedInfo(provider)),
          ),
        );
      }
      return output;
    }, [] as SimpleVolumeInfo[]);
  }

  public async inspectVolume(engineId: string, volumeName: string): Promise<VolumeInfo> {
    /**
     * Limitation of the podman desktop extension api, the inspect volume method is not exported
     */
    const volumes = await this.dependencies.containers.listVolumes();
    for (const volumeList of volumes) {
      if (volumeList.engineId === engineId) {
        const volume = volumeList.Volumes.find(v => v.Name === volumeName);
        if (volume) return volume;
      }
    }
    throw new Error(`Volume ${volumeName} not found on engine ${engineId}`);
  }

  protected toSimpleVolumeInfo(
    volume: VolumeInfo,
    connection: ProviderContainerConnectionIdentifierInfo,
  ): SimpleVolumeInfo {
    return {
      name: volume.Name,
      driver: volume.Driver,
      mountpoint: volume.Mountpoint,
      connection,
    };
  }

  dispose(): void {}
}
