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
import type { ProviderContainerConnectionIdentifierInfo } from '@podman-desktop/quadlet-extension-core-api';
import { QuadletType } from '@podman-desktop/quadlet-extension-core-api';
import type {
  ContainerInspectInfo,
  ImageInspectInfo,
  ProviderContainerConnection,
  TelemetryLogger,
  PodInspectInfo,
  VolumeInfo,
  NetworkInspectInfo,
} from '@podman-desktop/api';
import { Compose, ContainerGenerator, ImageGenerator, PodGenerator, VolumeGenerator } from 'podlet-js';
import { readFile } from 'node:fs/promises';
import { TelemetryEvents } from '../utils/telemetry-events';
import type { PodService } from './pod-service';
import type { PodmanService } from './podman-service';
import type { ProviderService } from './provider-service';
import type { PodmanWorker } from '../utils/worker/podman-worker';
import type { SemVer } from 'semver';
import type { VolumeService } from './volume-service';
import type { NetworkService } from './network-service';

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

const PODMAN_WORKER_MOCK: PodmanWorker = {
  getPodmanVersion: vi.fn(),
} as unknown as PodmanWorker;

const IMAGE_SERVICE_MOCK: ImageService = {
  inspectImage: vi.fn(),
} as unknown as ImageService;

const PROVIDER_CONTAINER_CONNECTION_MOCK: ProviderContainerConnection = {
  providerId: 'podman',
  connection: {
    name: 'vps-remote',
    type: 'podman',
    endpoint: {
      socketPath: '/foo.socket',
    },
    status: vi.fn(),
  },
};

const CONTAINER_CONNECTION_IDENTIFIER: ProviderContainerConnectionIdentifierInfo = {
  providerId: 'podman',
  name: 'Podman',
};

const POD_SERVICE_MOCK: PodService = {
  inspectPod: vi.fn(),
} as unknown as PodService;

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

const POD_INSPECT_MOCK: PodInspectInfo = {
  engineId: ENGINE_ID_MOCK,
  Id: 'pod-id',
} as unknown as PodInspectInfo;

const VOLUME_INFO_MOCK: VolumeInfo = {
  engineId: ENGINE_ID_MOCK,
  Name: 'volume-name',
} as unknown as VolumeInfo;

const NETWORK_INSPECT_MOCK: NetworkInspectInfo = {
  Name: 'foo',
} as unknown as NetworkInspectInfo;

const PODMAN_VERSION_MOCK: SemVer = {
  version: '5.0.0',
} as unknown as SemVer;

const PODMAN_SERVICE_MOCK: PodmanService = {
  getWorker: vi.fn(),
} as unknown as PodmanService;

const PROVIDER_SERVICE_MOCK: ProviderService = {
  getProviderContainerConnection: vi.fn(),
} as unknown as ProviderService;

const VOLUME_SERVICE_MOCK: VolumeService = {
  inspectVolume: vi.fn(),
} as unknown as VolumeService;

const NETWORK_SERVICE_MOCK: NetworkService = {
  inspectNetwork: vi.fn(),
} as unknown as NetworkService;

const CONTAINER_GENERATE_OUTPUT: string = 'container-quadlet-content';
const IMAGE_GENERATE_OUTPUT: string = 'image-quadlet-content';
const POD_GENERATE_OUTPUT: string = 'pod-quadlet-content';
const VOLUME_GENERATE_OUTPUT: string = 'volume-quadlet-content';

beforeEach(() => {
  vi.resetAllMocks();

  // mock container service
  vi.mocked(CONTAINER_SERVICE_MOCK.getEngineId).mockResolvedValue(ENGINE_ID_MOCK);
  vi.mocked(CONTAINER_SERVICE_MOCK.inspectContainer).mockResolvedValue(CONTAINER_INSPECT_MOCK);
  // mock image service
  vi.mocked(IMAGE_SERVICE_MOCK.inspectImage).mockResolvedValue(IMAGE_INSPECT_MOCK);

  vi.mocked(ContainerGenerator.prototype.generate).mockReturnValue(CONTAINER_GENERATE_OUTPUT);
  vi.mocked(ImageGenerator.prototype.generate).mockReturnValue(IMAGE_GENERATE_OUTPUT);
  vi.mocked(PodGenerator.prototype.generate).mockReturnValue(POD_GENERATE_OUTPUT);
  vi.mocked(VolumeGenerator.prototype.generate).mockReturnValue(VOLUME_GENERATE_OUTPUT);

  // mock pod service
  vi.mocked(POD_SERVICE_MOCK.inspectPod).mockResolvedValue(POD_INSPECT_MOCK);

  // mock volume service
  vi.mocked(VOLUME_SERVICE_MOCK.inspectVolume).mockResolvedValue(VOLUME_INFO_MOCK);

  // mock network service
  vi.mocked(NETWORK_SERVICE_MOCK.inspectNetwork).mockResolvedValue(NETWORK_INSPECT_MOCK);

  // mock provider service
  vi.mocked(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).mockReturnValue(PROVIDER_CONTAINER_CONNECTION_MOCK);
  vi.mocked(PODMAN_SERVICE_MOCK.getWorker).mockResolvedValue(PODMAN_WORKER_MOCK);
  vi.mocked(PODMAN_WORKER_MOCK.getPodmanVersion).mockResolvedValue(PODMAN_VERSION_MOCK);
});

function getService(): PodletJsService {
  return new PodletJsService({
    containers: CONTAINER_SERVICE_MOCK,
    images: IMAGE_SERVICE_MOCK,
    telemetry: TELEMETRY_MOCK,
    pods: POD_SERVICE_MOCK,
    podman: PODMAN_SERVICE_MOCK,
    providers: PROVIDER_SERVICE_MOCK,
    volumes: VOLUME_SERVICE_MOCK,
    networks: NETWORK_SERVICE_MOCK,
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
    });

    // Should get the corresponding engine id
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledExactlyOnceWith(CONTAINER_CONNECTION_IDENTIFIER);

    // should get the container inspect info
    expect(CONTAINER_SERVICE_MOCK.inspectContainer).toHaveBeenCalledExactlyOnceWith(
      ENGINE_ID_MOCK,
      CONTAINER_INSPECT_MOCK.Id,
    );

    // should get the image inspect info
    expect(IMAGE_SERVICE_MOCK.inspectImage).toHaveBeenCalledExactlyOnceWith(
      ENGINE_ID_MOCK,
      CONTAINER_INSPECT_MOCK.Image,
    );

    // should properly call the podlet-js container generator
    expect(ContainerGenerator).toHaveBeenCalledExactlyOnceWith({
      image: IMAGE_INSPECT_MOCK,
      container: CONTAINER_INSPECT_MOCK,
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
    });

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_GENERATE, {
        'quadlet-type': QuadletType.CONTAINER.toLowerCase(),
      });
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
    });

    // Should get the corresponding engine id
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledExactlyOnceWith(CONTAINER_CONNECTION_IDENTIFIER);

    // nothing related to containers
    expect(CONTAINER_SERVICE_MOCK.inspectContainer).not.toHaveBeenCalledOnce();

    // should get the image inspect info
    expect(IMAGE_SERVICE_MOCK.inspectImage).toHaveBeenCalledExactlyOnceWith(ENGINE_ID_MOCK, IMAGE_INSPECT_MOCK.Id);

    // should properly call the podlet-js image generator
    expect(ImageGenerator).toHaveBeenCalledExactlyOnceWith({
      image: IMAGE_INSPECT_MOCK,
    });

    // the output should match the mocked string
    expect(result).toStrictEqual(IMAGE_GENERATE_OUTPUT);
  });
});

describe('volume quadlets', () => {
  test('should use the volume service to inspect resources', async () => {
    const podletJs = getService();

    // generate volume quadlet
    const result = await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.VOLUME,
      resourceId: VOLUME_INFO_MOCK.Name,
    });

    // should get the volume info
    expect(VOLUME_SERVICE_MOCK.inspectVolume).toHaveBeenCalledExactlyOnceWith(ENGINE_ID_MOCK, VOLUME_INFO_MOCK.Name);

    // should properly call the podlet-js volume generator
    expect(VolumeGenerator).toHaveBeenCalledExactlyOnceWith({
      volume: VOLUME_INFO_MOCK,
    });

    // the output should match the mocked string
    expect(result).toStrictEqual(VOLUME_GENERATE_OUTPUT);
  });
});

describe('pod quadlets', () => {
  test('should use the pod service to inspect resources', async () => {
    const podletJs = getService();

    // generate pod quadlet
    const result = await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.POD,
      resourceId: POD_INSPECT_MOCK.Id,
    });

    // Should get the corresponding engine id
    expect(CONTAINER_SERVICE_MOCK.getEngineId).toHaveBeenCalledExactlyOnceWith(CONTAINER_CONNECTION_IDENTIFIER);

    // should get the pod inspect info
    expect(POD_SERVICE_MOCK.inspectPod).toHaveBeenCalledExactlyOnceWith(ENGINE_ID_MOCK, POD_INSPECT_MOCK.Id);

    // should properly call the podlet-js pod generator
    expect(PodGenerator).toHaveBeenCalledExactlyOnceWith({
      pod: POD_INSPECT_MOCK,
    });

    // should call generate with podman version
    expect(PodGenerator.prototype.generate).toHaveBeenCalledWith({
      podman: PODMAN_VERSION_MOCK.version,
    });

    // the output should match the mocked string
    expect(result).toStrictEqual(POD_GENERATE_OUTPUT);
  });

  test('generate pod should send telemetry event', async () => {
    const podletJs = getService();

    // generate pod quadlet
    await podletJs.generate({
      connection: CONTAINER_CONNECTION_IDENTIFIER,
      type: QuadletType.POD,
      resourceId: POD_INSPECT_MOCK.Id,
    });

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_GENERATE, {
        'quadlet-type': QuadletType.POD.toLowerCase(),
      });
    });
  });

  test('error in pod quadlet generate should send telemetry event including it', async () => {
    const podletJs = getService();

    const errorMock = new Error('dummy error');
    vi.mocked(POD_SERVICE_MOCK.inspectPod).mockRejectedValue(errorMock);

    // generate pod quadlet
    await expect(() => {
      return podletJs.generate({
        connection: CONTAINER_CONNECTION_IDENTIFIER,
        type: QuadletType.POD,
        resourceId: POD_INSPECT_MOCK.Id,
      });
    }).rejects.toThrowError('dummy error');

    await vi.waitFor(() => {
      expect(TELEMETRY_MOCK.logUsage).toHaveBeenCalledWith(TelemetryEvents.PODLET_GENERATE, {
        'quadlet-type': QuadletType.POD.toLowerCase(),
        error: errorMock,
      });
    });
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
    expect(readFile).toHaveBeenCalledExactlyOnceWith('dummy-path', { encoding: 'utf8' });

    // expect raw content to be used
    expect(Compose.fromString).toHaveBeenCalledExactlyOnceWith(COMPOSE_RAW_MOCK);

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
