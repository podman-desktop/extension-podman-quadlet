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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ContainerService } from './container-service';
import type { ImageService } from './image-service';
import { PodletJsService } from './podlet-js-service';
import type { ProviderContainerConnectionIdentifierInfo } from '/@shared/src/models/provider-container-connection-identifier-info';
import { QuadletType } from '/@shared/src/utils/quadlet-type';
import type { ContainerInspectInfo, ImageInspectInfo, TelemetryLogger } from '@podman-desktop/api';
import { Compose, ContainerGenerator, ImageGenerator } from 'podlet-js';
import { readFile } from 'node:fs/promises';
import { TelemetryEvents } from '../utils/telemetry-events';

/**
 *  mock the podlet-js library
 *  @remarks here we do not test the podlet-js library, we test the service
 */
vi.mock(import('podlet-js'));
// mock filesystem
vi.mock(import('node:fs/promises'));

const CONTAINER_SERVICE_MOCK: ContainerService = {
  inspectContainer: vi.fn(),
  getEngineId: vi.fn(),
} as unknown as ContainerService;

const IMAGE_SERVICE_MOCK: ImageService = {
  inspectImage: vi.fn(),
} as unknown as ImageService;

const CONTAINER_CONNECTION_IDENTIFIER: ProviderContainerConnectionIdentifierInfo = {
  providerId: 'podman',
  name: 'Podman',
};

const TELEMETRY_MOCK: TelemetryLogger = {
  logUsage: vi.fn(),
} as unknown as TelemetryLogger;

const ENGINE_ID_MOCK: string = 'dummy-engine-id';

const IMAGE_INSPECT_MOCK: ImageInspectInfo = {
  engineId: ENGINE_ID_MOCK,
  Id: 'image-id',
} as unknown as ImageInspectInfo;

const CONTAINER_INSPECT_MOCK: ContainerInspectInfo = {
  engineId: ENGINE_ID_MOCK,
  Image: 'dummy-image',
  Id: 'container-id',
} as unknown as ContainerInspectInfo;

const CONTAINER_GENERATE_OUTPUT: string = 'container-quadlet-content';
const IMAGE_GENERATE_OUTPUT: string = 'image-quadlet-content';

beforeEach(() => {
  vi.resetAllMocks();

  // mock container service
  vi.mocked(CONTAINER_SERVICE_MOCK.getEngineId).mockResolvedValue(ENGINE_ID_MOCK);
  vi.mocked(CONTAINER_SERVICE_MOCK.inspectContainer).mockResolvedValue(CONTAINER_INSPECT_MOCK);
  // mock image service
  vi.mocked(IMAGE_SERVICE_MOCK.inspectImage).mockResolvedValue(IMAGE_INSPECT_MOCK);

  vi.mocked(ContainerGenerator.prototype.generate).mockReturnValue(CONTAINER_GENERATE_OUTPUT);
  vi.mocked(ImageGenerator.prototype.generate).mockReturnValue(IMAGE_GENERATE_OUTPUT);
});

function getService(): PodletJsService {
  return new PodletJsService({
    containers: CONTAINER_SERVICE_MOCK,
    images: IMAGE_SERVICE_MOCK,
    telemetry: TELEMETRY_MOCK,
  });
}

describe('container quadlets', () => {
  test('should use the container and image service to inspect resources', async () => {
    const podletJs = getService();

    // generate container quadlet
    const result = await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.CONTAINER,
      resourceId: CONTAINER_INSPECT_MOCK.Id,
      options: {
        type: QuadletType.CONTAINER,
      },
    });

    // Should get the corresponding engine id
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledOnce();
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledWith(CONTAINER_CONNECTION_IDENTIFIER);

    // should get the container inspect info
    expect(CONTAINER_SERVICE_MOCK.inspectContainer).toHaveBeenCalledOnce();
    expect(CONTAINER_SERVICE_MOCK.inspectContainer).toHaveBeenCalledWith(ENGINE_ID_MOCK, CONTAINER_INSPECT_MOCK.Id);

    // should get the image inspect info
    expect(IMAGE_SERVICE_MOCK.inspectImage).toHaveBeenCalledOnce();
    expect(IMAGE_SERVICE_MOCK.inspectImage).toHaveBeenCalledWith(ENGINE_ID_MOCK, CONTAINER_INSPECT_MOCK.Image);

    // should properly call the podlet-js container generator
    expect(ContainerGenerator).toHaveBeenCalledOnce();
    expect(ContainerGenerator).toHaveBeenCalledWith({
      image: IMAGE_INSPECT_MOCK,
      container: CONTAINER_INSPECT_MOCK,
      options: {},
    });

    // the output should match the mocked string
    expect(result).toStrictEqual(CONTAINER_GENERATE_OUTPUT);
  });

  test('generate container should send telemetry event', async () => {
    const podletJs = getService();

    // generate container quadlet
    await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.CONTAINER,
      resourceId: CONTAINER_INSPECT_MOCK.Id,
      options: {
        type: QuadletType.CONTAINER,
      },
    });

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_GENERATE, {
        'quadlet-type': QuadletType.CONTAINER.toLowerCase(),
      });
    });
  });

  test('generate option should be properly passed to the podlet-js container generator', async () => {
    const podletJs = getService();

    // generate container quadlet
    await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.CONTAINER,
      resourceId: CONTAINER_INSPECT_MOCK.Id,
      options: {
        type: QuadletType.CONTAINER,
        wantedBy: 'default.target',
      },
    });

    // should properly call the podlet-js container generator
    expect(ContainerGenerator).toHaveBeenCalledOnce();
    expect(ContainerGenerator).toHaveBeenCalledWith({
      image: IMAGE_INSPECT_MOCK,
      container: CONTAINER_INSPECT_MOCK,
      options: {
        wantedBy: 'default.target',
      },
    });
  });

  test('error in container quadlet generate should send telemetry event including it', async () => {
    const podletJs = getService();

    const errorMock = new Error('dummy error');
    vi.mocked(CONTAINER_SERVICE_MOCK.inspectContainer).mockRejectedValue(errorMock);

    // generate container quadlet
    await expect(() => {
      return podletJs.generate({
        connection: CONTAINER_CONNECTION_IDENTIFIER,
        type: QuadletType.CONTAINER,
        resourceId: CONTAINER_INSPECT_MOCK.Id,
        options: {
          type: QuadletType.CONTAINER,
        },
      });
    }).rejects.toThrowError('dummy error');

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_GENERATE, {
        'quadlet-type': QuadletType.CONTAINER.toLowerCase(),
        error: errorMock,
      });
    });
  });
});

describe('image quadlets', () => {
  test('should use the container and image service to inspect resources', async () => {
    const podletJs = getService();

    // generate container quadlet
    const result = await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.IMAGE,
      resourceId: IMAGE_INSPECT_MOCK.Id,
      options: {
        type: QuadletType.IMAGE,
      },
    });

    // Should get the corresponding engine id
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledOnce();
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledWith(CONTAINER_CONNECTION_IDENTIFIER);

    // nothing related to containers
    expect(CONTAINER_SERVICE_MOCK.inspectContainer).not.toHaveBeenCalledOnce();

    // should get the image inspect info
    expect(IMAGE_SERVICE_MOCK.inspectImage).toHaveBeenCalledOnce();
    expect(IMAGE_SERVICE_MOCK.inspectImage).toHaveBeenCalledWith(ENGINE_ID_MOCK, IMAGE_INSPECT_MOCK.Id);

    // should properly call the podlet-js image generator
    expect(ImageGenerator).toHaveBeenCalledOnce();
    expect(ImageGenerator).toHaveBeenCalledWith({
      image: IMAGE_INSPECT_MOCK,
    });

    // the output should match the mocked string
    expect(result).toStrictEqual(IMAGE_GENERATE_OUTPUT);
  });
});

describe('compose', () => {
  const COMPOSE_RAW_MOCK = 'compose-content';
  const COMPOSE_MOCK: Compose = {
    toKubePlay: vi.fn(),
  } as unknown as Compose;

  const KUBE_MOCK: string = 'kube-content';

  beforeEach(() => {
    vi.mocked(readFile).mockResolvedValue(COMPOSE_RAW_MOCK);
    vi.mocked(Compose.fromString).mockReturnValue(COMPOSE_MOCK);

    vi.mocked(COMPOSE_MOCK.toKubePlay).mockReturnValue(KUBE_MOCK);
  });

  test('should read the provided file', async () => {
    const podletJs = getService();

    const result = await podletJs.compose({
      type: QuadletType.KUBE,
      filepath: 'dummy-path',
    });

    // ensure the right file is read
    expect(readFile).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledWith('dummy-path', { encoding: 'utf8' });

    // expect raw content to be used
    expect(Compose.fromString).toHaveBeenCalledOnce();
    expect(Compose.fromString).toHaveBeenCalledWith(COMPOSE_RAW_MOCK);

    // ensure the compose instance is converted to kube play
    expect(COMPOSE_MOCK.toKubePlay).toHaveBeenCalledOnce();

    expect(result).toStrictEqual(KUBE_MOCK);
  });

  test('should send telemetry event', async () => {
    const podletJs = getService();

    await podletJs.compose({
      type: QuadletType.KUBE,
      filepath: 'dummy-path',
    });

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_COMPOSE, {
        'quadlet-target-type': QuadletType.KUBE.toLowerCase(),
      });
    });
  });

  test('error in compose should send telemetry event including it', async () => {
    const podletJs = getService();

    const errorMock = new Error('dummy error');
    vi.mocked(readFile).mockRejectedValue(errorMock);

    await expect(() => {
      return podletJs.compose({
        type: QuadletType.KUBE,
        filepath: 'dummy-path',
      });
    }).rejects.toThrowError('dummy error');

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_COMPOSE, {
        'quadlet-target-type': QuadletType.KUBE.toLowerCase(),
        error: errorMock,
      });
    });
  });
});
