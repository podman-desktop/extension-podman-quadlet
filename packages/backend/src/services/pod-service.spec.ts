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
import { PodService } from './pod-service';
import type { ProviderService } from './provider-service';
import type { ContainerService } from './container-service';
import type { containerEngine, PodInfo, PodInspectInfo, ProviderContainerConnection } from '@podman-desktop/api';

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
};

const POD_INSPECT_MOCK: PodInspectInfo = {
  Name: 'foo',
  Id: 'foo',
} as unknown as PodInspectInfo;

const PROVIDER_SERVICE_MOCK: ProviderService = {
  getProviderContainerConnection: vi.fn(),
} as unknown as ProviderService;

const CONTAINER_ENGINE_MOCK: typeof containerEngine = {
  listPods: vi.fn(),
  inspectPod: vi.fn(),
  listInfos: vi.fn(),
} as unknown as typeof containerEngine;

const CONTAINER_SERVICE_MOCK: ContainerService = {} as unknown as ContainerService;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(CONTAINER_ENGINE_MOCK.inspectPod).mockResolvedValue(POD_INSPECT_MOCK);
});

function getPodService(): PodService {
  return new PodService({
    providers: PROVIDER_SERVICE_MOCK,
    containers: CONTAINER_ENGINE_MOCK,
    containerService: CONTAINER_SERVICE_MOCK,
  });
}

describe('PodService#all', () => {
  test('should return filtered pods', async () => {
    const podService = getPodService();

    vi.mocked(CONTAINER_ENGINE_MOCK.listPods).mockResolvedValue([
      {
        engineId: 'engine-1',
        Id: 'pod-1',
        Status: 'Running',
        Name: 'pod-1-name',
        Containers: [{ Names: 'container-1', Id: 'c1', Status: 'running' }],
      },
      {
        engineId: 'engine-2',
        Id: 'pod-2',
        Status: 'Running',
        Name: 'pod-2-name',
        Containers: [],
      },
    ] as unknown as PodInfo[]);

    vi.mocked(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).mockReturnValue(PROVIDER_CONTAINER_CONNECTION_MOCK);

    vi.mocked(CONTAINER_ENGINE_MOCK.listInfos).mockResolvedValue([
      { engineId: 'engine-1', engineType: 'podman', engineName: 'Podman' },
    ]);

    const result = await podService.all({ providerId: 'p1', name: 'connection-1' });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pod-1');
    expect(CONTAINER_ENGINE_MOCK.listPods).toHaveBeenCalled();
    expect(PROVIDER_SERVICE_MOCK.getProviderContainerConnection).toHaveBeenCalledWith({
      providerId: 'p1',
      name: 'connection-1',
    });
    expect(CONTAINER_ENGINE_MOCK.listInfos).toHaveBeenCalledWith({
      provider: PROVIDER_CONTAINER_CONNECTION_MOCK.connection,
    });
  });
});

describe('PodService#inspectPod', () => {
  test('should call containers inspectPod', async () => {
    const podService = getPodService();
    const result = await podService.inspectPod('engine-id', 'pod-id');

    expect(CONTAINER_ENGINE_MOCK.inspectPod).toHaveBeenCalledExactlyOnceWith('engine-id', 'pod-id');
    expect(result).toEqual(POD_INSPECT_MOCK);
  });
});
