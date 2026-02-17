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
import { NetworkService } from './network-service';
import type { ProviderService } from './provider-service';
import type { containerEngine, ProviderContainerConnection, NetworkInspectInfo } from '@podman-desktop/api';
import type { ProviderContainerConnectionIdentifierInfo } from '@podman-desktop/quadlet-extension-core-api';

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
} as unknown as ProviderService;

const CONTAINER_ENGINE_MOCK: typeof containerEngine = {
  listNetworks: vi.fn(),
  listInfos: vi.fn(),
} as unknown as typeof containerEngine;

beforeEach(() => {
  vi.resetAllMocks();
});

function getNetworkService(): NetworkService {
  return new NetworkService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
  });
}

describe('NetworkService#all', () => {
  test('should return filtered networks', async () => {
    const networkService = getNetworkService();

    const network1: NetworkInspectInfo = {
      Id: 'network-1',
      Name: 'network-1',
      Driver: 'bridge',
      engineId: 'engine-1',
    } as unknown as NetworkInspectInfo;

    const network2: NetworkInspectInfo = {
      Id: 'network-2',
      Name: 'network-2',
      Driver: 'bridge',
      engineId: 'engine-2',
    } as unknown as NetworkInspectInfo;

    vi.mocked(CONTAINER_ENGINE_MOCK.listNetworks).mockResolvedValue([network1, network2]);

    vi.mocked(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).mockReturnValue(PROVIDER_CONTAINER_CONNECTION_MOCK);
    vi.mocked(CONTAINER_ENGINE_MOCK.listInfos).mockResolvedValue([
      { engineId: 'engine-1', engineType: 'podman', engineName: 'Podman' },
    ]);

    const connectionIdentifier: ProviderContainerConnectionIdentifierInfo = { providerId: 'p1', name: 'connection-1' };

    const result = await networkService.all(connectionIdentifier);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('network-1');
    expect(result[0].connection).toBe(connectionIdentifier);
    expect(CONTAINER_ENGINE_MOCK.listNetworks).toHaveBeenCalled();
    expect(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).toHaveBeenCalledWith(connectionIdentifier);
  });
});

describe('NetworkService#inspectNetwork', () => {
  test('should return network info', async () => {
    const networkService = getNetworkService();

    const network1: NetworkInspectInfo = {
      Id: 'network-1',
      Name: 'network-1',
      engineId: 'engine-1',
    } as unknown as NetworkInspectInfo;

    vi.mocked(CONTAINER_ENGINE_MOCK.listNetworks).mockResolvedValue([network1]);

    const result = await networkService.inspectNetwork('engine-1', 'network-1');

    expect(result).toBe(network1);
  });

  test('should throw error if network not found', async () => {
    const networkService = getNetworkService();

    vi.mocked(CONTAINER_ENGINE_MOCK.listNetworks).mockResolvedValue([]);

    await expect(networkService.inspectNetwork('engine-1', 'network-1')).rejects.toThrowError(
      'Network network-1 not found on engine engine-1',
    );
  });
});
