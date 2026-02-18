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
  protected async generateContainer(engineId: string, containerId: string): Promise<string> {
    const container: ContainerInspectInfo = await this.dependencies.containers.inspectContainer(engineId, containerId);

    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, container.Image);

    return new ContainerGenerator({
      container,
      image,
    }).generate();
  }

  /**
   * Using the `podlet-js` package, generate a stringify {@link ImageQuadlet}
   * @param engineId
   * @param imageId
   * @protected
   */
  protected async generateImage(engineId: string, imageId: string): Promise<string> {
    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, imageId);

    return new ImageGenerator({
      image: image,
    }).generate();
  }

  protected async generatePod(engineId: string, podId: string, version: string): Promise<string> {
    const pod: PodInspectInfo = await this.dependencies.pods.inspectPod(engineId, podId);
    return new PodGenerator({
      pod: pod,
    }).generate({
      podman: version,
    });
  }

  protected async generateVolume(engineId: string, volumeName: string): Promise<string> {
    const volume: VolumeInfo = await this.dependencies.volumes.inspectVolume(engineId, volumeName);
    return new VolumeGenerator({
      volume: volume,
    }).generate();
  }

  protected async generateNetwork(engineId: string, networkIdOrName: string): Promise<string> {
    const network: NetworkInspectInfo = await this.dependencies.networks.inspectNetwork(engineId, networkIdOrName);
    return new NetworkGenerator({
      network: network,
    }).generate();
  }

  public async generate(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: QuadletType;
    resourceId: string;
  }): Promise<string> {
    const records: Record<string, unknown> = {
      'quadlet-type': options.type.toLowerCase(),
    };

    // Get the engine id
    const engineId = await this.dependencies.containers.getEngineId(options.connection);

    try {
      switch (options.type) {
        case QuadletType.CONTAINER:
          return await this.generateContainer(engineId, options.resourceId);
        case QuadletType.IMAGE:
          return await this.generateImage(engineId, options.resourceId);
        case QuadletType.POD: {
          const provider = this.dependencies.providers.getProviderContainerConnection(options.connection);
          const worker = await this.dependencies.podman.getWorker(provider);
          const podmanVersion: SemVer = await worker.getPodmanVersion();

          return await this.generatePod(engineId, options.resourceId, podmanVersion.version);
        }
        case QuadletType.VOLUME:
          return await this.generateVolume(engineId, options.resourceId);
        case QuadletType.NETWORK:
          return await this.generateNetwork(engineId, options.resourceId);
        default:
          throw new Error(`cannot generate quadlet type ${options.type}: unsupported`);
      }
    } catch (err: unknown) {
      records['error'] = err;
      throw err;
    } finally {
      this.dependencies.telemetry.logUsage(TelemetryEvents.PODLET_GENERATE, records);
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
