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
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType, type QuadletTypeGenerate } from '/@shared/src/utils/quadlet-type';
import type { ContainerService } from './container-service';
import type { ImageService } from './image-service';
import type { ContainerInspectInfo, ImageInspectInfo, TelemetryLogger } from '@podman-desktop/api';
import { ContainerGenerator, Compose, ImageGenerator } from 'podlet-js';
import { readFile } from 'node:fs/promises';
import { TelemetryEvents } from '../utils/telemetry-events';
import type { QuadletGenerateOptions } from '/@shared/src/models/quadlet-generate-options';
import type { ContainerGeneratorOptions } from 'podlet-js';

interface Dependencies {
  containers: ContainerService;
  images: ImageService;
  telemetry: TelemetryLogger;
}

export class PodletJsService {
  constructor(protected dependencies: Dependencies) {}

  /**
   * Using the `podlet-js` package, generate a stringify {@link ContainerQuadlet}
   * @param engineId
   * @param containerId
   * @param options
   * @protected
   */
  protected async generateContainer(
    engineId: string,
    containerId: string,
    options: ContainerGeneratorOptions,
  ): Promise<string> {
    const container: ContainerInspectInfo = await this.dependencies.containers.inspectContainer(engineId, containerId);

    const image: ImageInspectInfo = await this.dependencies.images.inspectImage(engineId, container.Image);

    return new ContainerGenerator({
      container,
      image,
      options,
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

  public async generate<T extends QuadletTypeGenerate>(options: {
    connection: ProviderContainerConnectionIdentifierInfo;
    type: T;
    options: QuadletGenerateOptions & { type: T };
    resourceId: string;
  }): Promise<string> {
    const records: Record<string, unknown> = {
      'quadlet-type': options.type.toLowerCase(),
    };

    // Get the engine id
    const engineId = await this.dependencies.containers.getEngineId(options.connection);

    const { type, ...rest } = options.options;
    try {
      switch (type) {
        case QuadletType.CONTAINER:
          return await this.generateContainer(engineId, options.resourceId, { ...rest });
        case QuadletType.IMAGE:
          return await this.generateImage(engineId, options.resourceId);
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
