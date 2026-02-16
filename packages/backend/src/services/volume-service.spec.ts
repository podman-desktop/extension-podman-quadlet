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

import { beforeEach, vi, describe, test, expect } from 'vitest';
import { VolumeService } from './volume-service';
import type { ProviderService } from './provider-service';
import type { containerEngine, ProviderContainerConnection, VolumeListInfo, VolumeInfo } from '@podman-desktop/api';
import type {
  ProviderContainerConnectionIdentifierInfo,
  ProviderContainerConnectionDetailedInfo,
} from '@podman-desktop/quadlet-extension-core-api';

const PROVIDER_CONTAINER_CONNECTION_MOCK: ProviderContainerConnection = {
  connection: {
    name: 'connection-1',
    status: vi.fn(),
    endpoint: {
      socketPath: '/foo.socket',
    },
    type: 'podman',
  },
  providerId: 'podman',
} as unknown as ProviderContainerConnection;

const PROVIDER_SERVICE_MOCK: ProviderService = {
  getProviderContainerConnection: vi.fn(),
  toProviderContainerConnectionDetailedInfo: vi.fn(),
} as unknown as ProviderService;

const CONTAINER_ENGINE_MOCK: typeof containerEngine = {
  listVolumes: vi.fn(),
  listInfos: vi.fn(),
} as unknown as typeof containerEngine;

beforeEach(() => {
  vi.resetAllMocks();
});

function getVolumeService(): VolumeService {
  return new VolumeService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
  });
}

describe('VolumeService#all', () => {
  test('should return filtered volumes', async () => {
    const volumeService = getVolumeService();

    const volume1: VolumeInfo = {
      Name: 'volume-1',
      Driver: 'local',
      Mountpoint: '/path/1',
      engineId: 'engine-1',
    } as unknown as VolumeInfo;

    const volume2: VolumeInfo = {
      Name: 'volume-2',
      Driver: 'local',
      Mountpoint: '/path/2',
      engineId: 'engine-2',
    } as unknown as VolumeInfo;

    vi.mocked(CONTAINER_ENGINE_MOCK.listVolumes).mockResolvedValue([
      {
        engineId: 'engine-1',
        Volumes: [volume1],
      },
      {
        engineId: 'engine-2',
        Volumes: [volume2],
      },
    ] as unknown as VolumeListInfo[]);

    vi.mocked(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).mockReturnValue(PROVIDER_CONTAINER_CONNECTION_MOCK);
    vi.mocked(CONTAINER_ENGINE_MOCK.listInfos).mockResolvedValue([
      { engineId: 'engine-1', engineType: 'podman', engineName: 'Podman' },
    ]);

    const connectionIdentifier: ProviderContainerConnectionIdentifierInfo = { providerId: 'p1', name: 'connection-1' };
    const connectionDetailed: ProviderContainerConnectionDetailedInfo = { ...connectionIdentifier, status: 'started' };
    vi.mocked(PROVIDER_SERVICE_MOCK.toProviderContainerConnectionDetailedInfo).mockReturnValue(connectionDetailed);

    const result = await volumeService.all(connectionIdentifier);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('volume-1');
    expect(result[0].connection).toBe(connectionDetailed);
    expect(CONTAINER_ENGINE_MOCK.listVolumes).toHaveBeenCalled();
    expect(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).toHaveBeenCalledWith(connectionIdentifier);
    expect(CONTAINER_ENGINE_MOCK.listInfos).toHaveBeenCalledWith({
      provider: PROVIDER_CONTAINER_CONNECTION_MOCK.connection,
    });
  });

  test('should throw error if engine info not found', async () => {
    const volumeService = getVolumeService();

    vi.mocked(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).mockReturnValue(PROVIDER_CONTAINER_CONNECTION_MOCK);
    vi.mocked(CONTAINER_ENGINE_MOCK.listInfos).mockResolvedValue([]);

    await expect(volumeService.all({ providerId: 'p1', name: 'connection-1' })).rejects.toThrowError(
      'cannot find matching info for connection connection-1',
    );
  });
});

describe('VolumeService#inspectVolume', () => {
  test('should return volume info', async () => {
    const volumeService = getVolumeService();

    const volume1: VolumeInfo = {
      Name: 'volume-1',
      engineId: 'engine-1',
    } as unknown as VolumeInfo;

    vi.mocked(CONTAINER_ENGINE_MOCK.listVolumes).mockResolvedValue([
      {
        engineId: 'other-engine',
        Volumes: [],
      },
      {
        engineId: 'engine-1',
        Volumes: [volume1],
      },
    ] as unknown as VolumeListInfo[]);

    const result = await volumeService.inspectVolume('engine-1', 'volume-1');

    expect(result).toBe(volume1);
  });

  test('should throw error if volume not found', async () => {
    const volumeService = getVolumeService();

    vi.mocked(CONTAINER_ENGINE_MOCK.listVolumes).mockResolvedValue([
      {
        engineId: 'engine-1',
        Volumes: [],
      },
    ] as unknown as VolumeListInfo[]);

    await expect(volumeService.inspectVolume('engine-1', 'volume-1')).rejects.toThrowError(
      'Volume volume-1 not found on engine engine-1',
    );
  });
});
