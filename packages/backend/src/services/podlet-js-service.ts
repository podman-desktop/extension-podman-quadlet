/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
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
import type { ProviderContainerConnectionIdentifierInfo } from '@podman-desktop/quadlet-extension-core-api';
import { QuadletType } from '@podman-desktop/quadlet-extension-core-api';
import type { ContainerService } from './container-service';
import type { ImageService } from './image-service';
import type {
  ContainerInspectInfo,
  ImageInspectInfo,
  PodInspectInfo,
  TelemetryLogger,
  VolumeInfo,
  NetworkInspectInfo,
} from '@podman-desktop/api';
import {
  Compose,
  ContainerGenerator,
  ImageGenerator,
  PodGenerator,
  VolumeGenerator,
  NetworkGenerator,
} from 'podlet-js';
import { readFile } from 'node:fs/promises';
import { TelemetryEvents } from '../utils/telemetry-events';
import type { PodService } from './pod-service';
import type { PodmanService } from './podman-service';
import type { ProviderService } from './provider-service';
import type { VolumeService } from './volume-service';
import type { NetworkService } from './network-service';
import type { SemVer } from 'semver';

interface Dependencies {
  containers: ContainerService;
  images: ImageService;
  pods: PodService;
  volumes: VolumeService;
  networks: NetworkService;
  telemetry: TelemetryLogger;
  providers: ProviderService;
  podman: PodmanService;
}

export class PodletJsService {
  constructor(protected dependencies: Dependencies) {}

  /**
   * Using the `podlet-js` package, generate a stringify {@link ContainerQuadlet}
   * @param engineId
   * @param containerId
   * @protected
   */
  public async generateContainer(
    connection: ProviderContainerConnectionIdentifierInfo,
    containerId: string,
  ): Promise<string> {
    return this.withTelemetry(
      async () => {
        // Get the engine id
        const engineId = await this.dependencies.containers.getEngineId(connection);

        const container: ContainerInspectInfo = await this.dependencies.containers.inspectContainer(
          engineId,
          containerId,
        );

        const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, container.Image);

        return new ContainerGenerator({
          container,
          image,
        }).generate();
      },
      {
        'quadlet-type': QuadletType.CONTAINER.toLowerCase(),
      },
    );
  }

  /**
   * Using the `podlet-js` package, generate a stringify {@link ImageQuadlet}
   * @param engineId
   * @param imageId
   * @protected
   */
  public async generateImage(connection: ProviderContainerConnectionIdentifierInfo, imageId: string): Promise<string> {
    return this.withTelemetry(
      async () => {
        // Get the engine id
        const engineId = await this.dependencies.containers.getEngineId(connection);

        const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, imageId);

        return new ImageGenerator({
          image: image,
        }).generate();
      },
      {
        'quadlet-type': QuadletType.IMAGE.toLowerCase(),
      },
    );
  }

  public async generatePod(connection: ProviderContainerConnectionIdentifierInfo, podId: string): Promise<string> {
    return this.withTelemetry(
      async () => {
        // Get the engine id
        const engineId = await this.dependencies.containers.getEngineId(connection);

        const provider = this.dependencies.providers.getProviderContainerConnection(connection);
        const worker = await this.dependencies.podman.getWorker(provider);
        const podmanVersion: SemVer = await worker.getPodmanVersion();

        const pod: PodInspectInfo = await this.dependencies.pods.inspectPod(engineId, podId);
        return new PodGenerator({
          pod: pod,
        }).generate({
          podman: podmanVersion.version,
        });
      },
      {
        'quadlet-type': QuadletType.POD.toLowerCase(),
      },
    );
  }

  public async generateVolume(
    connection: ProviderContainerConnectionIdentifierInfo,
    volumeName: string,
  ): Promise<string> {
    return this.withTelemetry(
      async () => {
        // Get the engine id
        const engineId = await this.dependencies.containers.getEngineId(connection);

        const volume: VolumeInfo = await this.dependencies.volumes.inspectVolume(engineId, volumeName);
        return new VolumeGenerator({
          volume: volume,
        }).generate();
      },
      {
        'quadlet-type': QuadletType.VOLUME.toLowerCase(),
      },
    );
  }

  public async generateNetwork(
    connection: ProviderContainerConnectionIdentifierInfo,
    networkIdOrName: string,
  ): Promise<string> {
    return this.withTelemetry(
      async () => {
        // Get the engine id
        const engineId = await this.dependencies.containers.getEngineId(connection);

        const network: NetworkInspectInfo = await this.dependencies.networks.inspectNetwork(engineId, networkIdOrName);
        return new NetworkGenerator({
          network: network,
        }).generate();
      },
      {
        'quadlet-type': QuadletType.NETWORK.toLowerCase(),
      },
    );
  }

  protected async withTelemetry<T>(fn: () => Promise<T>, telemetry: Record<string, unknown>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      telemetry['error'] = err;
      throw err;
    } finally {
      this.dependencies.telemetry.logUsage(TelemetryEvents.PODLET_GENERATE, telemetry);
    }
  }

  public async compose(options: {
    filepath: string;
    type: QuadletType.CONTAINER | QuadletType.KUBE | QuadletType.POD;
  }): Promise<string> {
    if (options.type !== QuadletType.KUBE) throw new Error(`cannot generate quadlet type ${options.type}: unsupported`);

    const records: Record<string, unknown> = {
      'quadlet-target-type': options.type.toLowerCase(),
    };

    try {
      const content = await readFile(options.filepath, { encoding: 'utf8' });
      return Compose.fromString(content).toKubePlay();
    } catch (err: unknown) {
      records['error'] = err;
      throw err;
    } finally {
      this.dependencies.telemetry.logUsage(TelemetryEvents.PODLET_COMPOSE, records);
    }
  }
}
